/**
 * feedback-conductor.js
 * OpenClaw Skill — Orchestrates a 2-turn conversational feedback session.
 *
 * Flow:
 *   1. Check anti-interrupt rules (stress, time, battery, dedup)
 *   2. POST to backend /api/feedback/trigger → triggers Telegram conversation
 *   3. Write feedback YAML to memory/feedback/{feature_slug}/{YYYY-MM-DD}.yaml
 *
 * The actual Telegram conversation (send Q1, wait for reply, send Q2, wait, parse)
 * is handled by the backend's telegram_bot.py service using LLM-generated questions.
 *
 * NOTE: Users can also trigger feedback directly via Telegram /use command,
 * bypassing this skill entirely. This skill is for the automated HEARTBEAT flow.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Load .env if available
try { require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); } catch (e) {}

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// ── Build version detection ──────────────────────────────────────────────────
function detectBuildVersion() {
  try {
    // Try to read Android build version via Termux
    const build = require('child_process')
      .execSync('getprop ro.build.display.id', { timeout: 3000 })
      .toString().trim();
    if (build) return build;
  } catch (e) {
    // Not on Android — use generic label
  }
  return "Android 14 / Generic";
}

const BUILD_VERSION = detectBuildVersion();

// ── Anti-Interrupt Rules ──────────────────────────────────────────────────────
const DEFERRED_FILE = path.join(__dirname, '..', 'memory', 'deferred_sessions.yaml');

function shouldDefer(feature, healthContext) {
  // Rule 1: stress_score > 75 → defer 2 hours
  if (healthContext.stress_score > 75) {
    logDeferral(feature, 'stress_score_high', `stress=${healthContext.stress_score}`);
    return { defer: true, reason: 'stress_score_high', hours: 2 };
  }

  // Rule 2: night time (23:00–07:00) → defer to morning
  if (healthContext.time_of_day === 'night') {
    logDeferral(feature, 'night_time', 'time_of_day=night');
    return { defer: true, reason: 'night_time', hours: 8 };
  }

  // Rule 3: battery < 15% → skip entirely
  if (healthContext.battery_level < 15) {
    logDeferral(feature, 'low_battery', `battery=${healthContext.battery_level}%`);
    return { defer: true, reason: 'low_battery', hours: -1 }; // -1 = skip, don't reschedule
  }

  return { defer: false };
}

function logDeferral(feature, reason, detail) {
  console.log(`[Feedback Conductor] DEFERRED: ${feature} — ${reason} (${detail})`);
  try {
    let sessions = { sessions: [] };
    if (fs.existsSync(DEFERRED_FILE)) {
      sessions = YAML.parse(fs.readFileSync(DEFERRED_FILE, 'utf-8')) || { sessions: [] };
    }
    sessions.sessions.push({
      feature: feature.toLowerCase().replace(/\s+/g, '_'),
      original_trigger_time: new Date().toISOString(),
      reason: reason,
      detail: detail,
      rescheduled_for: reason === 'low_battery' ? 'skipped'
        : new Date(Date.now() + (reason === 'night_time' ? 8 : 2) * 3600000).toISOString()
    });
    // Keep only last 50 entries
    if (sessions.sessions.length > 50) {
      sessions.sessions = sessions.sessions.slice(-50);
    }
    fs.writeFileSync(DEFERRED_FILE, YAML.stringify(sessions));
  } catch (e) {
    console.error('[Feedback Conductor] Failed to log deferral:', e.message);
  }
}

// ── YAML Memory Writer ────────────────────────────────────────────────────────
function writeFeedbackYAML(feature, healthContext) {
  const featureSlug = feature.toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const feedbackDir = path.join(__dirname, '..', 'memory', 'feedback', featureSlug);

  try {
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }

    const yamlData = {
      feature: featureSlug,
      build_version: BUILD_VERSION,
      timestamp: new Date().toISOString(),
      context: {
        stress_score: healthContext.stress_score,
        sleep_score: healthContext.sleep_score,
        heart_rate: healthContext.heart_rate,
        steps_today: healthContext.steps_today,
        battery_level: healthContext.battery_level,
        time_of_day: healthContext.time_of_day,
        is_charging: healthContext.is_charging || false
      },
      responses: {
        q1_satisfaction: null,  // filled by backend after Telegram conversation
        q1_verbatim: null,
        q2_friction: null,
        q2_verbatim: null
      },
      sentiment: "pending",
      auto_tags: [],
      severity: "pending"
    };

    const filePath = path.join(feedbackDir, `${dateStr}.yaml`);
    fs.writeFileSync(filePath, YAML.stringify(yamlData));
    console.log(`[Feedback Conductor] YAML written: ${filePath}`);
  } catch (e) {
    console.error('[Feedback Conductor] Failed to write YAML:', e.message);
  }
}

// ── Main Skill Export ─────────────────────────────────────────────────────────
module.exports = async function feedbackConductor(input) {
  const { feature, health_context } = input;
  console.log(`[Feedback Conductor] Starting session for ${feature}`);

  // Step 1: Check anti-interrupt rules
  const deferResult = shouldDefer(feature, health_context);
  if (deferResult.defer) {
    return { 
      status: "deferred", 
      reason: deferResult.reason,
      reschedule_hours: deferResult.hours
    };
  }

  // Step 2: Write initial YAML (will be updated by backend after conversation)
  writeFeedbackYAML(feature, health_context);

  // Step 3: Trigger real Telegram conversation via backend
  const chatId = parseInt(TELEGRAM_CHAT_ID);
  if (!chatId) {
    console.error('[Feedback Conductor] No TELEGRAM_CHAT_ID configured. Cannot trigger conversation.');
    return { status: "error", reason: "no_chat_id" };
  }

  const triggerData = {
    chat_id: chatId,
    feature: feature,
    health_context: health_context
  };

  try {
    const response = await axios.post(`${BACKEND_URL}/api/feedback/trigger`, triggerData);
    console.log(`[Feedback Conductor] Successfully triggered Telegram chat: ${response.status}`);
    return { status: "telegram_chat_started", chat_id: chatId };
  } catch (error) {
    console.error(`[Feedback Conductor] Failed to trigger Telegram chat:`, error.message);
    return { status: "error", reason: error.message };
  }
};

// If run directly from the command line (for testing)
if (require.main === module) {
  const mockInput = {
    feature: "Google Lens",
    health_context: {
      stress_score: 42,
      sleep_score: 78,
      heart_rate: 72,
      steps_today: 3200,
      battery_level: 67,
      time_of_day: "afternoon",
      is_charging: false
    }
  };
  module.exports(mockInput).then(console.log).catch(console.error);
}

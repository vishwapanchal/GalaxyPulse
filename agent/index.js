#!/usr/bin/env node
/**
 * GalaxyPulse Agent — Main Orchestrator (index.js)
 * ═══════════════════════════════════════════════════
 *
 * Runs on Android via Termux. Polls Android UsageStats every 5 minutes.
 * When a supported AI feature is detected, calls the backend which
 * then sends a Telegram message asking for feedback — automatically,
 * without the user typing any command.
 *
 * Setup on Android (Termux):
 *   pkg install nodejs termux-api
 *   (grant Usage Access in Android Settings > Apps > Special App Access > Usage Access)
 *   node index.js
 *
 * Architecture:
 *   Android OS UsageStats → feature-watcher.js → POST /api/feedback/trigger
 *   → telegram_bot.py → LLM question → Telegram message to user
 *   → user replies → LLM parses → stores in DB → dashboard updates
 */

require('dotenv').config({ path: '../.env' });

const featureWatcher  = require('./skills/feature-watcher');
const healthContext   = require('./skills/health-context');

const BACKEND_URL     = process.env.BACKEND_URL || 'http://localhost:8000';
const TELEGRAM_CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID || '0', 10);
const POLL_INTERVAL_MS = 5 * 1000;   // 5 seconds (testing) — change to 5 * 60 * 1000 for production

// ── Logging ───────────────────────────────────────────────────────────────────
function log(level, ...args) {
  const ts = new Date().toISOString().slice(11, 19);
  const prefix = { INFO: '🟢', WARN: '🟡', ERROR: '🔴', DEBUG: '⚪' }[level] || '•';
  console.log(`[${ts}] ${prefix} [${level}]`, ...args);
}

// ── Call backend to trigger Telegram feedback conversation ────────────────────
async function triggerFeedback(featureName, healthCtx) {
  if (!TELEGRAM_CHAT_ID) {
    log('WARN', 'TELEGRAM_CHAT_ID not set in .env — cannot trigger conversation');
    return false;
  }

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    feature: featureName,
    health_context: healthCtx,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/feedback/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      log('INFO', `✅ Trigger sent for "${featureName}" → Telegram message dispatched`);
      return true;
    } else {
      const err = await response.text();
      log('WARN', `Backend trigger failed (${response.status}): ${err}`);
      return false;
    }
  } catch (e) {
    log('ERROR', `Network error calling backend: ${e.message}`);
    return false;
  }
}

// ── Anti-interrupt check ──────────────────────────────────────────────────────
function shouldDefer(healthCtx) {
  if (healthCtx.time_of_day === 'night') {
    log('DEBUG', 'Defer: night time');
    return true;
  }
  if (healthCtx.stress_score > 75) {
    log('DEBUG', `Defer: high stress (${healthCtx.stress_score})`);
    return true;
  }
  if (healthCtx.battery_level < 15) {
    log('DEBUG', `Defer: low battery (${healthCtx.battery_level}%)`);
    return true;
  }
  return false;
}

// ── Main poll loop ────────────────────────────────────────────────────────────
async function poll() {
  log('INFO', '🔍 Polling Android UsageStats...');

  try {
    // 1. Get health context (real biometrics on Samsung Health SDK, heuristic otherwise)
    const health = await healthContext({ source: 'termux' });

    // 2. Anti-interrupt check BEFORE polling (saves power)
    if (shouldDefer(health)) {
      log('INFO', `Skipping this poll — ${health.time_of_day} / stress ${health.stress_score}`);
      return;
    }

    // Detect recently used AI features via UsageStats
    // Always look back at least 1 minute regardless of poll speed
    const lookbackMin = Math.max(1, Math.ceil(POLL_INTERVAL_MS / 60000));
    const detected = await featureWatcher({ lookback_minutes: lookbackMin });

    if (!detected || detected.length === 0) {
      log('DEBUG', 'No new AI feature usage detected');
      return;
    }

    log('INFO', `Detected ${detected.length} feature(s): ${detected.map(f => f.feature_name).join(', ')}`);

    // 4. Trigger feedback conversation for each detected feature
    for (const feature of detected) {
      log('INFO', `→ Triggering feedback for: ${feature.feature_name} (used for ${feature.duration_sec}s)`);
      await triggerFeedback(feature.feature_name, health);
      // Small delay between multiple triggers to avoid message spam
      if (detected.length > 1) await new Promise(r => setTimeout(r, 2000));
    }

  } catch (e) {
    log('ERROR', `Poll error: ${e.message}`);
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(55));
  console.log('  🌌 GalaxyPulse Android Agent');
  console.log('  Autonomous feature usage detector');
  console.log('═'.repeat(55));
  console.log(`  Backend URL:    ${BACKEND_URL}`);
  console.log(`  Telegram chat:  ${TELEGRAM_CHAT_ID || '⚠️ NOT SET'}`);
  console.log(`  Poll interval:  ${POLL_INTERVAL_MS / 1000 / 60} minutes`);
  console.log('═'.repeat(55) + '\n');

  if (!TELEGRAM_CHAT_ID) {
    log('WARN', 'Set TELEGRAM_CHAT_ID in .env to enable proactive Telegram messages!');
  }

  // Check backend connectivity
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    log('INFO', `Backend connected: ${data.service} v${data.version}`);
  } catch (e) {
    log('WARN', `Cannot reach backend at ${BACKEND_URL} — messages will fail until it's running`);
  }

  // Run first poll immediately
  await poll();

  const intervalDisplay = POLL_INTERVAL_MS < 60000
    ? `${POLL_INTERVAL_MS / 1000}s (testing mode)`
    : `${POLL_INTERVAL_MS / 60000} minutes`;
  log('INFO', `⏰ Polling every ${intervalDisplay}. Waiting...`);
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch(e => {
  log('ERROR', 'Fatal error:', e);
  process.exit(1);
});

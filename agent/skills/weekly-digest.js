/**
 * weekly-digest.js
 * OpenClaw Skill — Aggregates weekly feedback from YAML memory,
 * summarizes via LLM (OpenRouter), POSTs to backend, and sends
 * a Telegram summary to the PM.
 *
 * Triggered by HEARTBEAT every Monday at 09:00.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Load .env if available
try { require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); } catch (e) {}

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const LLM_MODEL = process.env.LLM_PRIMARY_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const PM_CHAT_ID = process.env.PM_TELEGRAM_CHAT_ID || '';

// ── Read YAML Feedback Files ──────────────────────────────────────────────────
function readWeeklyFeedback(weekStart) {
  const feedbackDir = path.join(__dirname, '..', 'memory', 'feedback');
  const allFeedback = [];

  if (!fs.existsSync(feedbackDir)) {
    console.log('[Weekly Digest] No feedback directory found.');
    return allFeedback;
  }

  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  // Walk through each feature subdirectory
  const featureDirs = fs.readdirSync(feedbackDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const featureSlug of featureDirs) {
    const featurePath = path.join(feedbackDir, featureSlug);
    const yamlFiles = fs.readdirSync(featurePath)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of yamlFiles) {
      // Extract date from filename (YYYY-MM-DD.yaml)
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;

      const fileDate = new Date(dateMatch[1]);
      if (fileDate >= startDate && fileDate < endDate) {
        try {
          const content = fs.readFileSync(path.join(featurePath, file), 'utf-8');
          const parsed = YAML.parse(content);
          if (parsed) {
            parsed._source_file = `${featureSlug}/${file}`;
            allFeedback.push(parsed);
          }
        } catch (e) {
          console.warn(`[Weekly Digest] Failed to parse ${featureSlug}/${file}:`, e.message);
        }
      }
    }
  }

  console.log(`[Weekly Digest] Found ${allFeedback.length} feedback entries for week of ${weekStart}`);
  return allFeedback;
}

// ── Summarize with LLM (OpenRouter) ───────────────────────────────────────────
async function summarizeWithLLM(feedbackData, weekStart) {
  if (!OPENROUTER_API_KEY) {
    console.warn('[Weekly Digest] No OPENROUTER_API_KEY — using fallback summary');
    return buildFallbackSummary(feedbackData, weekStart);
  }

  const feedbackYAML = feedbackData.map(f => YAML.stringify(f)).join('\n---\n');

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: LLM_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a Samsung product analytics AI. Analyze the following feedback data and return a structured JSON summary with these exact keys:
- top_issues: list of {feature, issue, count, severity} — top 5 most common friction points
- sentiment_changes: dict of feature_id → {delta, trend} — sentiment trend this week
- novelty_flags: list of new friction patterns not seen before (strings)
- ota_correlations: list of {feature, build_version, impact} — any OTA-related patterns
Return ONLY valid JSON, no explanation, no markdown.`
        },
        {
          role: "user",
          content: `Week: ${weekStart}\n\nFeedback data (${feedbackData.length} entries):\n${feedbackYAML.substring(0, 8000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://galaxypulse.app',
        'X-Title': 'GalaxyPulse'
      }
    });

    const raw = response.data.choices[0].message.content.trim();
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```(?:json)?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Weekly Digest] LLM summarization failed:', e.message);
    return buildFallbackSummary(feedbackData, weekStart);
  }
}

// ── Fallback summary when LLM is unavailable ──────────────────────────────────
function buildFallbackSummary(feedbackData, weekStart) {
  const featureCounts = {};
  for (const f of feedbackData) {
    const fid = f.feature || 'unknown';
    featureCounts[fid] = (featureCounts[fid] || 0) + 1;
  }

  return {
    top_issues: Object.entries(featureCounts).map(([feature, count]) => ({
      feature: feature.replace(/_/g, ' '),
      issue: "Aggregated feedback (LLM unavailable)",
      count: count,
      severity: "medium"
    })),
    sentiment_changes: {},
    novelty_flags: [],
    ota_correlations: []
  };
}

// ── Send Telegram Summary to PM ───────────────────────────────────────────────
async function sendTelegramDigest(digest, weekStart) {
  if (!TELEGRAM_BOT_TOKEN || !PM_CHAT_ID) {
    console.log('[Weekly Digest] No PM Telegram config — skipping notification');
    return;
  }

  const topIssues = (digest.top_issues || []).slice(0, 3)
    .map((i, idx) => `  ${idx + 1}. ${i.feature}: ${i.issue} (${i.count}x, ${i.severity})`)
    .join('\n');

  const novelty = (digest.novelty_flags || []).slice(0, 3)
    .map(f => `  ✨ ${f}`)
    .join('\n');

  const message = `📊 *GalaxyPulse Weekly Digest*\n_Week of ${weekStart}_\n\n` +
    `🔥 *Top Issues:*\n${topIssues || '  No major issues this week'}\n\n` +
    `${novelty ? `✨ *New Patterns:*\n${novelty}\n\n` : ''}` +
    `View full report on the dashboard →`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: PM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log(`[Weekly Digest] Telegram summary sent to PM (chat_id: ${PM_CHAT_ID})`);
  } catch (e) {
    console.error('[Weekly Digest] Failed to send Telegram digest:', e.message);
  }
}

// ── Main Skill Export ─────────────────────────────────────────────────────────
module.exports = async function weeklyDigest(input) {
  const weekStart = input.week_start || getLastMondayDate();
  console.log(`[Weekly Digest] Generating digest for week of ${weekStart}`);

  // Step 1: Read all YAML feedback files for the week
  const feedbackData = readWeeklyFeedback(weekStart);

  // Step 2: Summarize with LLM
  const digestData = await summarizeWithLLM(feedbackData, weekStart);
  digestData.week_start = weekStart;

  // Step 3: POST to backend /api/digest/weekly
  try {
    const response = await axios.post(`${BACKEND_URL}/api/digest/weekly`, digestData);
    console.log(`[Weekly Digest] Posted digest to backend: ${response.status}`);
  } catch (error) {
    console.error(`[Weekly Digest] Failed to post to backend:`, error.message);
  }

  // Step 4: Send Telegram summary to PM
  await sendTelegramDigest(digestData, weekStart);

  return digestData;
};

/**
 * Get the date of last Monday in YYYY-MM-DD format.
 */
function getLastMondayDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 1, Sunday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

// If run directly (for testing)
if (require.main === module) {
  module.exports({ week_start: getLastMondayDate() }).then(console.log).catch(console.error);
}

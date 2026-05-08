/**
 * feature-watcher.js
 * OpenClaw Skill — Monitors Android UsageStats for Galaxy AI feature usage.
 *
 * On Android (Termux): reads `termux-usagestats` output.
 * On desktop / if Termux unavailable: falls back to DEMO MODE with simulated detection.
 *
 * Feature registry includes both Samsung Galaxy AI and generic Android AI apps,
 * so the system works on ANY Android device — not just Samsung.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Feature Package Registry (Samsung + Generic Android AI) ──────────────────
const FEATURE_REGISTRY = {
  // Samsung Galaxy AI (auto-detects on Samsung devices)
  "com.samsung.android.photostudio":          "AI Photo Erase",
  "com.samsung.android.app.notes":            "Note Assist",
  "com.samsung.android.wallpaper.res":        "AI Wallpaper",
  "com.samsung.android.livestranslate":       "Live Translate",
  // Generic Android AI (works on ANY Android device)
  "com.google.android.googlequicksearchbox":  "Circle to Search",
  "com.google.android.apps.translate":        "Google Translate AI",
  "com.google.ar.lens":                       "Google Lens",
  "com.google.android.apps.photos":           "Google Photos AI",
  "com.google.android.tts":                   "Text-to-Speech AI",
  "com.google.android.inputmethod.latin":     "Gboard Smart Compose",
};

// Exported for Telegram bot /features command
const KNOWN_FEATURE_NAMES = [...new Set(Object.values(FEATURE_REGISTRY))];

const MINIMUM_ENGAGEMENT_SEC = 3;   // Minimum 3 seconds in foreground
const DEDUP_HOURS = 6;              // Same feature not re-triggered within 6 hours

// Path to deduplication state file
const DEDUP_FILE = path.join(__dirname, '..', 'memory', 'last_triggered.json');

/**
 * Load the last-triggered timestamps from disk.
 * Returns: { "AI Photo Erase": "2026-05-08T10:00:00.000Z", ... }
 */
function loadDedupState() {
  try {
    if (fs.existsSync(DEDUP_FILE)) {
      return JSON.parse(fs.readFileSync(DEDUP_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore parse errors */ }
  return {};
}

/**
 * Save the dedup state back to disk.
 */
function saveDedupState(state) {
  try {
    const dir = path.dirname(DEDUP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEDUP_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("[Feature Watcher] Failed to save dedup state:", e.message);
  }
}

/**
 * Check if a feature was triggered within the last DEDUP_HOURS.
 */
function wasRecentlyTriggered(featureName, dedupState) {
  const lastTime = dedupState[featureName];
  if (!lastTime) return false;
  const elapsed = Date.now() - new Date(lastTime).getTime();
  return elapsed < DEDUP_HOURS * 60 * 60 * 1000;
}

/**
 * Try to read Android UsageStats via Termux API.
 * Returns an array of detected AI features (Samsung + generic), or null if Termux is unavailable.
 */
function tryTermuxUsageStats(lookbackMinutes) {
  try {
    const raw = execSync('termux-usagestats', { timeout: 10000 }).toString();
    const stats = JSON.parse(raw);
    const now = Date.now();
    const cutoff = now - (lookbackMinutes * 60 * 1000);
    const detected = [];

    for (const entry of stats) {
      const pkg = entry.packageName || entry.package;
      if (!pkg || !FEATURE_REGISTRY[pkg]) continue;

      // Check time window
      const lastUsed = entry.lastTimeUsed || entry.last_time_used || 0;
      if (lastUsed < cutoff) continue;

      // Check minimum engagement (totalTimeInForeground is in milliseconds)
      const foregroundMs = entry.totalTimeInForeground || entry.total_time_foreground || 0;
      const foregroundSec = foregroundMs / 1000;
      if (foregroundSec < MINIMUM_ENGAGEMENT_SEC) continue;

      detected.push({
        package: pkg,
        feature_name: FEATURE_REGISTRY[pkg],
        duration_sec: Math.round(foregroundSec),
        timestamp: new Date(lastUsed).toISOString()
      });
    }

    return detected;
  } catch (e) {
    // Termux API not available (running on desktop, or not installed)
    return null;
  }
}

/**
 * DEMO MODE: Simulate a feature detection for testing purposes.
 * Uses generic Android AI features so it works on any device.
 */
function simulateDetection() {
  console.log("DEMO MODE: simulating feature detection (use Telegram /use command for real interaction)");
  const genericFeatures = [
    ["com.google.ar.lens", "Google Lens"],
    ["com.google.android.apps.translate", "Google Translate AI"],
    ["com.google.android.apps.photos", "Google Photos AI"],
    ["com.google.android.googlequicksearchbox", "Circle to Search"],
  ];
  const [pkg, name] = genericFeatures[Math.floor(Math.random() * genericFeatures.length)];
  return [{
    package: pkg,
    feature_name: name,
    duration_sec: Math.floor(Math.random() * 55) + 5,  // 5–60 seconds
    timestamp: new Date().toISOString()
  }];
}

// ── Main Skill Export ─────────────────────────────────────────────────────────
module.exports = async function featureWatcher(input) {
  const lookbackMinutes = input.lookback_minutes || 10;

  // Step 1: Try real UsageStats, fallback to demo
  let detected = tryTermuxUsageStats(lookbackMinutes);
  if (detected === null) {
    detected = simulateDetection();
  }

  if (detected.length === 0) {
    return [];
  }

  // Step 2: Apply deduplication filter
  const dedupState = loadDedupState();
  const filtered = detected.filter(f => !wasRecentlyTriggered(f.feature_name, dedupState));

  // Step 3: Mark newly triggered features
  for (const f of filtered) {
    dedupState[f.feature_name] = new Date().toISOString();
  }
  saveDedupState(dedupState);

  return filtered;
};

// Export known features list
module.exports.KNOWN_FEATURE_NAMES = KNOWN_FEATURE_NAMES;
module.exports.FEATURE_REGISTRY = FEATURE_REGISTRY;

// If run directly (for testing)
if (require.main === module) {
  module.exports({ lookback_minutes: 10 }).then((features) => {
    console.log("Detected features:", JSON.stringify(features, null, 2));
    console.log("\nAll known features:", KNOWN_FEATURE_NAMES);
  });
}

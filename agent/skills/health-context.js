/**
 * health-context.js
 * OpenClaw Skill — Fetches biometric context for feedback trigger decisions.
 *
 * // MOCK: Replace this block with Samsung Health SDK when available
 * All biometric values below are randomly generated within realistic ranges.
 * When the Samsung Health SDK is integrated, replace the mock block with:
 *   const healthData = await SamsungHealth.getLatestReadings();
 */

const { execSync } = require('child_process');

module.exports = async function healthContext(input) {
  // ── Time of day (REAL — derived from system clock) ──────────────────────
  const hours = new Date().getHours();
  let time_of_day = "night";
  if (hours >= 7 && hours < 12) time_of_day = "morning";
  else if (hours >= 12 && hours < 17) time_of_day = "afternoon";
  else if (hours >= 17 && hours < 23) time_of_day = "evening";
  // night = 23:00–06:59

  // ── Battery level (try Android system, fallback to random) ──────────────
  let battery_level;
  try {
    const batteryJson = execSync('termux-battery-status', { timeout: 5000 }).toString();
    const batteryData = JSON.parse(batteryJson);
    battery_level = batteryData.percentage || randomInt(15, 95);
  } catch (e) {
    // Not on Android / Termux not available — use random
    battery_level = randomInt(15, 95);
  }

  // ── MOCK: Replace this block with Samsung Health SDK when available ──────
  const context = {
    stress_score:  randomInt(20, 85),    // Samsung Health stress score
    sleep_score:   randomInt(45, 95),    // Last night's sleep quality
    heart_rate:    randomInt(58, 95),    // Resting heart rate (bpm)
    steps_today:   randomInt(800, 12000), // Pedometer
    battery_level: battery_level,
    time_of_day:   time_of_day,
    is_charging:   Math.random() > 0.5
  };
  // ── END MOCK ────────────────────────────────────────────────────────────

  return context;
};

/**
 * Random integer in range [min, max] inclusive.
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// If run directly (for testing)
if (require.main === module) {
  module.exports({}).then((ctx) => {
    console.log("Health Context:", JSON.stringify(ctx, null, 2));
  });
}

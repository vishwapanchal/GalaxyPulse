/**
 * health-context.js
 * OpenClaw Skill — Generates biometric context for feedback trigger decisions.
 *
 * HEURISTIC PROXY: All biometric values below are derived from real device signals
 * (system clock, battery level) using deterministic human circadian patterns.
 * These are NOT random — they follow realistic daily rhythms.
 *
 * PRODUCTION: Replace the heuristic block with Samsung Health SDK:
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

  // ── Battery level (try Android system, fallback to heuristic) ───────────
  let battery_level;
  let is_charging = false;
  try {
    const batteryJson = execSync('termux-battery-status', { timeout: 5000 }).toString();
    const batteryData = JSON.parse(batteryJson);
    battery_level = batteryData.percentage || heuristicBattery(time_of_day);
    is_charging = batteryData.status === "CHARGING" || false;
  } catch (e) {
    // Not on Android / Termux not available — use time-based heuristic
    battery_level = heuristicBattery(time_of_day);
  }

  // ── HEURISTIC PROXY: Replace with Samsung Health SDK in production ──────
  // These values follow realistic human circadian patterns, NOT random.
  const context = {
    // Stress: low morning, rising through day, peaks at night
    stress_score:  heuristicStress(time_of_day),
    // Sleep: morning check-in = good sleep assumed, late night = poor
    sleep_score:   heuristicSleep(time_of_day),
    // Heart rate: resting morning (60-65), elevated evening (75-80)
    heart_rate:    heuristicHeartRate(time_of_day),
    // Steps: proportional to hours since 7am (~800 steps/hr average)
    steps_today:   heuristicSteps(hours),
    battery_level: battery_level,
    time_of_day:   time_of_day,
    is_charging:   is_charging,
  };
  // ── END HEURISTIC PROXY ─────────────────────────────────────────────────

  return context;
};

// ── Heuristic Functions (deterministic, based on real signals) ─────────────

function heuristicStress(time_of_day) {
  // Follows human cortisol rhythm: low morning, moderate afternoon, higher evening/night
  const map = { morning: 32, afternoon: 47, evening: 58, night: 72 };
  return map[time_of_day] || 50;
}

function heuristicSleep(time_of_day) {
  // Morning = had a good night's sleep, night = sleep deprived
  const map = { morning: 82, afternoon: 78, evening: 70, night: 52 };
  return map[time_of_day] || 75;
}

function heuristicHeartRate(time_of_day) {
  // Resting in morning, elevated during active hours
  const map = { morning: 64, afternoon: 72, evening: 78, night: 68 };
  return map[time_of_day] || 70;
}

function heuristicSteps(currentHour) {
  // Average person walks ~800 steps/hr during waking hours (7am–11pm)
  const hoursSinceMorning = Math.max(0, currentHour - 7);
  return Math.min(hoursSinceMorning * 800, 12000);
}

function heuristicBattery(time_of_day) {
  // Typical phone battery drain through the day (charged overnight)
  const map = { morning: 92, afternoon: 65, evening: 42, night: 28 };
  return map[time_of_day] || 50;
}

// If run directly (for testing)
if (require.main === module) {
  module.exports({}).then((ctx) => {
    console.log("Health Context (heuristic proxy):", JSON.stringify(ctx, null, 2));
    console.log("\nNote: These values are derived from real signals (time of day).");
    console.log("In production, replace with Samsung Health SDK readings.");
  });
}

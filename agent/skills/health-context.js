/**
 * health-context.js
 * OpenClaw Skill to fetch biometric state from Samsung Health SDK.
 * (Mocked for prototype)
 */

module.exports = async function healthContext(input) {
  // Generate plausible random biometric data
  const hours = new Date().getHours();
  let timeOfDay = "night";
  if (hours >= 6 && hours < 12) timeOfDay = "morning";
  else if (hours >= 12 && hours < 17) timeOfDay = "afternoon";
  else if (hours >= 17 && hours < 22) timeOfDay = "evening";

  return {
    stress_score: Math.floor(Math.random() * 100), // 0 to 100
    sleep_score: Math.floor(Math.random() * 40) + 60, // 60 to 100
    heart_rate: Math.floor(Math.random() * 40) + 60, // 60 to 100
    steps_today: Math.floor(Math.random() * 10000),
    battery_level: Math.floor(Math.random() * 80) + 20, // 20 to 100
    time_of_day: timeOfDay,
    is_charging: Math.random() > 0.8
  };
};

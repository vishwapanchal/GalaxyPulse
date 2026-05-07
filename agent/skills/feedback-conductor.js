/**
 * feedback-conductor.js
 * OpenClaw Skill to run a 2-turn conversational feedback session.
 * (Mocked for prototype: it mocks the LLM/WhatsApp interaction and POSTs to backend)
 */
const axios = require('axios');

module.exports = async function feedbackConductor(input) {
  const { feature, health_context } = input;
  console.log(`[Feedback Conductor] Starting session for ${feature}`);

  // In a real implementation, this skill uses Claude API to generate Q1,
  // sends it via WhatsApp, waits for the user, generates Q2, etc.
  
  // Here we mock a successfully parsed 2-turn conversation result:
  const sessionResult = {
    session_id: `sess_${Date.now()}`,
    user_id: "mock_user_123",
    feature_id: feature.replace(/\s+/g, '_').toLowerCase(),
    feature_name: feature,
    build_version: "One UI 7.0 / May OTA",
    satisfaction: Math.floor(Math.random() * 5) + 1, // 1 to 5
    friction: Math.random() > 0.5,
    severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
    sentiment: ["positive", "negative_friction", "neutral"][Math.floor(Math.random() * 3)],
    verbatim_q1: "It was okay, but a bit slow.",
    verbatim_q2: "I had to try twice.",
    auto_tags: ["speed", "multi_attempt"],
    stress_score: health_context.stress_score,
    sleep_score: health_context.sleep_score,
    heart_rate: health_context.heart_rate,
    steps_today: health_context.steps_today,
    battery_level: health_context.battery_level,
    time_of_day: health_context.time_of_day,
    location_type: "home",
    timestamp: new Date().toISOString()
  };

  // POST the result to the FastAPI backend
  try {
    const response = await axios.post('http://localhost:8000/api/feedback', sessionResult);
    console.log(`[Feedback Conductor] Successfully posted feedback to backend: ${response.status}`);
  } catch (error) {
    console.error(`[Feedback Conductor] Failed to post to backend:`, error.message);
  }

  return sessionResult;
};

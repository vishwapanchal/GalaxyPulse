/**
 * feedback-conductor.js
 * OpenClaw Skill to run a 2-turn conversational feedback session.
 * (Mocked for prototype: it mocks the LLM/WhatsApp interaction and POSTs to backend)
 */
const axios = require('axios');

module.exports = async function feedbackConductor(input) {
  const { feature, health_context } = input;
  console.log(`[Feedback Conductor] Starting session for ${feature}`);

  // We trigger the real conversation via the backend instead of mocking
  // IMPORTANT: You must configure your chat_id here or pass it in via input
  const chatId = process.env.TELEGRAM_CHAT_ID || 123456789; // Replace with your numeric Telegram chat ID

  const triggerData = {
    chat_id: parseInt(chatId),
    feature: feature,
    health_context: health_context
  };

  try {
    const response = await axios.post('http://127.0.0.1:8000/api/feedback/trigger', triggerData);
    console.log(`[Feedback Conductor] Successfully triggered real Telegram chat: ${response.status}`);
  } catch (error) {
    console.error(`[Feedback Conductor] Failed to trigger Telegram chat:`, error.message);
  }

  return { status: "telegram_chat_started" };
};

// If run directly from the command line (for testing)
if (require.main === module) {
  const mockInput = {
    feature: "AI Photo Erase",
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

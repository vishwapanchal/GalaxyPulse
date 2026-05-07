/**
 * weekly-digest.js
 * OpenClaw Skill to aggregate feedback and post weekly digest.
 * (Mocked for prototype)
 */
const axios = require('axios');

module.exports = async function weeklyDigest(input) {
  const { week_start } = input;
  console.log(`[Weekly Digest] Generating digest for week of ${week_start}`);

  // In a real implementation, this reads YAML files from agent/memory/feedback/
  // and summarizes them using Claude API.
  
  const digestData = {
    week_start: week_start,
    top_issues: [
      { feature: "AI Photo Erase", issue: "Shadow artifacts on edges", count: 12 },
      { feature: "Circle to Search", issue: "Fails to trigger on lockscreen", count: 8 }
    ],
    sentiment_changes: {
      "AI Photo Erase": -0.4,
      "Circle to Search": 0.2,
      "AI Wallpaper": 0.1
    },
    novelty_flags: [
      "Users reporting battery drain after using AI Wallpaper (new this week)"
    ],
    ota_correlations: [
      { update: "May OTA", impact: "Negative sentiment spike for AI Photo Erase" }
    ]
  };

  try {
    const response = await axios.post('http://localhost:8000/api/digest/weekly', digestData);
    console.log(`[Weekly Digest] Successfully posted digest to backend: ${response.status}`);
  } catch (error) {
    console.error(`[Weekly Digest] Failed to post to backend:`, error.message);
  }

  return digestData;
};

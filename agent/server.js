const express = require('express');
const cors = require('cors');
const feedbackConductor = require('./skills/feedback-conductor');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// OpenClaw Agent Gateway Endpoint
app.post('/openclaw/trigger', async (req, res) => {
  console.log(`\n[OpenClaw Agent] Received trigger request for feature: ${req.body.feature}`);
  
  try {
    const input = {
      feature: req.body.feature,
      health_context: req.body.health_context,
      chat_id: req.body.chat_id,
      decision: req.body.decision,
      explanation: req.body.explanation
    };

    // Execute the feedback-conductor skill
    const result = await feedbackConductor(input);
    
    // The feedback-conductor will handle the downstream call to the Python backend
    // if the anti-interrupt rules pass. We just return its result to the Android app.
    res.json({
      success: true,
      openclaw_agent: true,
      result: result
    });
    
  } catch (error) {
    console.error('[OpenClaw Agent] Error executing skill:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/openclaw/health', (req, res) => {
  res.json({
    status: 'online',
    agent: 'OpenClaw Gateway Server',
    version: '1.0.0'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('═'.repeat(55));
  console.log('  🌌 OpenClaw Gateway Server');
  console.log('  Listening for Android requests on port', PORT);
  console.log('═'.repeat(55));
});

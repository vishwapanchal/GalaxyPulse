/**
 * telegram-test.js
 * Simple test script to verify Telegram bot token and chat ID are working.
 *
 * Usage:
 *   node telegram-test.js
 *
 * Expected output: "GalaxyPulse bot is online ✅" sent to the configured chat.
 */

const path = require('path');
const https = require('https');

// Load .env
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) {
  console.error('dotenv not installed. Run: npm install');
  process.exit(1);
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
  console.error('   1. Message @BotFather on Telegram → /newbot → get your token');
  console.error('   2. Message your bot, then visit:');
  console.error(`      https://api.telegram.org/bot<TOKEN>/getUpdates`);
  console.error('   3. Copy chat.id into .env as TELEGRAM_CHAT_ID');
  process.exit(1);
}

const message = "GalaxyPulse bot is online ✅\n\n" +
  "🔧 Configuration verified:\n" +
  `• Bot Token: ...${TOKEN.slice(-6)}\n` +
  `• Chat ID: ${CHAT_ID}\n` +
  `• Timestamp: ${new Date().toISOString()}\n\n` +
  "The agent is ready to collect Galaxy AI feedback.";

const postData = JSON.stringify({
  chat_id: CHAT_ID,
  text: message
});

const options = {
  hostname: 'api.telegram.org',
  path: `/bot${TOKEN}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Telegram test message sent successfully!');
      console.log(`   Chat ID: ${CHAT_ID}`);
      console.log('   Check your Telegram — you should see the message.');
    } else {
      console.error(`❌ Telegram API returned ${res.statusCode}:`);
      try {
        const parsed = JSON.parse(data);
        console.error(`   ${parsed.description || data}`);
      } catch (e) {
        console.error(`   ${data}`);
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Network error: ${e.message}`);
});

req.write(postData);
req.end();

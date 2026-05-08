# 📱 GalaxyPulse Android Setup (Termux)

This is how the bot **automatically knows** what app you opened — no `/use` command needed.

## How it works

```
You open Google Lens on your phone
         ↓
Android UsageStats API records it
         ↓
agent/index.js polls every 5 min via termux-usagestats
         ↓
Detects Google Lens was used for >3 seconds
         ↓
Calls POST http://your-backend/api/feedback/trigger
         ↓
Backend sends you a Telegram message:
"Hey! You just used Google Lens — how did it go?"
         ↓
You reply naturally
         ↓
LLM parses → tags → stores in DB → dashboard updates
```

## Setup Steps

### 1. Install Termux (F-Droid version — NOT Play Store)
```
https://f-droid.org/packages/com.termux/
https://f-droid.org/packages/com.termux.api/    ← also install this
```

### 2. Grant Usage Access
```
Android Settings → Apps → Special App Access → Usage Access → Termux → Allow
```
> ⚠️ This is the ONLY permission needed. No root required.

### 3. Install Node.js in Termux
```bash
pkg update && pkg upgrade -y
pkg install nodejs termux-api git -y
```

### 4. Clone / copy the agent to your phone
Option A — via Git (if backend is on GitHub):
```bash
git clone https://github.com/yourname/galaxypulse.git
cd galaxypulse/agent
```

Option B — via USB/ADB:
```bash
adb push agent/ /data/data/com.termux/files/home/galaxypulse-agent/
```

### 5. Configure environment
```bash
cd ~/galaxypulse/agent
cp ../.env .env
# Edit .env — make sure these are set:
nano .env
```

Required vars in `.env`:
```
BACKEND_URL=http://YOUR_PC_IP:8000      # your PC's local IP
TELEGRAM_CHAT_ID=6536013557             # your Telegram chat ID
OPENROUTER_API_KEY=sk-or-v1-...
```

> 💡 Find your PC's IP: run `ipconfig` on Windows → look for IPv4 under Wi-Fi

### 6. Install dependencies
```bash
npm install
```

### 7. Run the agent
```bash
node index.js
```

You'll see:
```
═══════════════════════════════════════════════════════
  🌌 GalaxyPulse Android Agent
  Autonomous feature usage detector
═══════════════════════════════════════════════════════
  Backend URL:    http://192.168.1.5:8000
  Telegram chat:  6536013557
  Poll interval:  5 minutes
═══════════════════════════════════════════════════════

[17:00:01] 🟢 [INFO] Backend connected: GalaxyPulse API v1.0.0
[17:00:01] 🟢 [INFO] 🔍 Polling Android UsageStats...
[17:00:01] ⚪ [DEBUG] No new AI feature usage detected
[17:00:01] 🟢 [INFO] ⏰ Polling every 5 minutes. Waiting...
```

### 8. Test it!
Open Google Lens or Google Photos on your phone, use it for >3 seconds, wait up to 5 minutes.

Your Telegram bot will message you **automatically** asking for feedback.

---

## Keep it running (auto-start)

Add to Termux:Widget or run in background:
```bash
nohup node index.js > agent.log 2>&1 &
```

Or use Termux:Boot to auto-start on phone reboot:
```bash
mkdir -p ~/.termux/boot
echo "cd ~/galaxypulse/agent && node index.js &" > ~/.termux/boot/start-agent.sh
chmod +x ~/.termux/boot/start-agent.sh
```

---

## Features Tracked Automatically

| App | Feature Name |
|-----|-------------|
| Google Lens (`com.google.ar.lens`) | Google Lens |
| Google Translate (`com.google.android.apps.translate`) | Google Translate AI |
| Google Photos (`com.google.android.apps.photos`) | Google Photos AI |
| Google Search (`com.google.android.googlequicksearchbox`) | Circle to Search |
| Gboard (`com.google.android.inputmethod.latin`) | Gboard Smart Compose |
| Samsung Notes (`com.samsung.android.app.notes`) | Note Assist |
| Samsung Photo Studio (`com.samsung.android.photostudio`) | AI Photo Erase |
| Samsung Live Translate (`com.samsung.android.livestranslate`) | Live Translate |

---

## For the Demo (without Termux)

If you can't install Termux right now, the backend scheduler proactively pings you at:
- 08:00, 12:00, 16:00, 20:00 daily (same autonomous flow, time-based instead of UsageStats)

Or trigger instantly via the API:
```
POST http://localhost:8000/api/scheduler/ping-now
```

# 🌌 GalaxyPulse

### Contextual Micro-Feedback Harvesting for Samsung Galaxy AI Features
**PRISM OpenClaw Hackathon · Theme 2: Daily Utility (Smartphones)**

### 📺 [Prototype Demo Video Link](https://drive.google.com/drive/folders/1foc44pPXYKj-wE_tSzdwN8CRrX2Rd_Qd?usp=sharing)

---

## What is GalaxyPulse?

GalaxyPulse is an always-on Android agent (running via OpenClaw on Termux) that:

1. **Detects** when a Galaxy AI feature was used (via Android UsageStats API)
2. **Checks** biometric context (stress, sleep, heart rate — mocked from Samsung Health)
3. **Sends** a conversational 2-question feedback session over **Telegram**
4. **Stores** feedback as YAML files in OpenClaw's durable memory
5. **POSTs** feedback to a FastAPI backend
6. **Displays** results on a web dashboard for Samsung PMs

**Core novelty:** No existing product combines always-on OS-level usage detection + biometric context + conversational LLM-driven feedback + longitudinal memory.

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│               ANDROID PHONE (Termux)                  │
│                                                       │
│  UsageStats API ──► feature-watcher.js                │
│  Samsung Health  ──► health-context.js (MOCKED)       │
│                                                       │
│  HEARTBEAT.md polls every 5 min                       │
│  └─► Anti-interrupt checks (stress/time/battery)      │
│  └─► feedback-conductor.js → triggers Telegram chat   │
│  └─► weekly-digest.js → Monday 09:00 PM summary      │
└────────────────────────┬──────────────────────────────┘
                         │ Telegram Bot API
                         ▼
              ┌─────────────────────┐
              │   FastAPI Backend   │──► SQLite DB
              │   (Python 3.11+)   │
              └──────────┬──────────┘
                         │ REST API
                         ▼
              ┌─────────────────────┐
              │  Next.js Dashboard  │
              │  (React + Recharts) │
              └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Runtime | OpenClaw (Termux, Android) |
| LLM | meta-llama/llama-3.3-70b-instruct:free via [OpenRouter](https://openrouter.ai) |
| Channel | Telegram Bot API |
| Feedback Storage | YAML files (durable memory) |
| Usage Detection | Android UsageStatsManager |
| Health Context | Samsung Health SDK (MOCKED — see below) |
| Backend | Python 3.11+ · FastAPI · SQLAlchemy · SQLite |
| Frontend | Next.js 15 · Tailwind CSS · Recharts |
| Deployment | Render (backend) · Vercel (frontend) |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| Git | any | [git-scm.com](https://git-scm.com) |

---

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/vishwapanchal/GalaxyPulse.git
cd GalaxyPulse
```

### 2. Set Up the Telegram Bot

**Step 1 — Create the bot (one-time):**
1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Give it a name (e.g., "GalaxyPulse Bot")
4. Give it a username (e.g., "galaxypulse_feedback_bot")
5. BotFather returns a **BOT_TOKEN** — copy it

**Step 2 — Get your Chat ID (one-time):**
1. Open your new bot in Telegram and send it any message (e.g., "hello")
2. Open this URL in your browser (replace `<TOKEN>` with your bot token):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. Find `"chat": {"id": 123456789}` in the JSON response — that's your **CHAT_ID**

**Step 3 — Configure `.env` files:**

Edit `backend/.env`:
```env
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_CHAT_ID=your-chat-id-here
PM_TELEGRAM_CHAT_ID=your-chat-id-here
OPENROUTER_API_KEY=your-openrouter-key
```

Edit `agent/.env`:
```env
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_CHAT_ID=your-chat-id-here
PM_TELEGRAM_CHAT_ID=your-chat-id-here
OPENROUTER_API_KEY=your-openrouter-key
```

**Step 4 — Test the bot:**
```bash
cd agent
npm install
node telegram-test.js
```
You should see "GalaxyPulse bot is online ✅" in your Telegram chat.

### 3. Start the Backend

```powershell
cd backend
py -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Seed the database with demo data
python seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Start the Frontend

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Dashboard: http://localhost:3000

---

## LLM Configuration

All LLM calls (question generation, auto-tagging, digest summarization) use:

| Setting | Value |
|---------|-------|
| Provider | [OpenRouter](https://openrouter.ai) (free tier) |
| Model | `meta-llama/llama-3.3-70b-instruct:free` |
| Base URL | `https://openrouter.ai/api/v1` |
| Auth Header | `Authorization: Bearer ${OPENROUTER_API_KEY}` |

Sign up free at [openrouter.ai](https://openrouter.ai) → Keys → Create Key.

---

## Project Structure

```
galaxypulse/
├── agent/
│   ├── SOUL.md                          # Agent persona & rules
│   ├── HEARTBEAT.md                     # 5-min poll loop definition
│   ├── .env                             # Agent environment variables
│   ├── telegram-test.js                 # Telegram connectivity test
│   ├── skills/
│   │   ├── feature-watcher.js           # Android UsageStats monitor
│   │   ├── SKILL_feature-watcher.md
│   │   ├── health-context.js            # Samsung Health (MOCKED)
│   │   ├── SKILL_health-context.md
│   │   ├── feedback-conductor.js        # 2-turn feedback orchestrator
│   │   ├── SKILL_feedback-conductor.md
│   │   ├── weekly-digest.js             # Monday PM digest
│   │   └── SKILL_weekly-digest.md
│   └── memory/
│       ├── feedback/                    # YAML feedback files per feature
│       ├── user_profile.yaml
│       ├── feature_health_scores.yaml
│       └── deferred_sessions.yaml
├── backend/
│   ├── .env                             # Backend environment variables
│   ├── app/
│   │   ├── main.py                      # FastAPI entry point
│   │   ├── core/config.py               # Settings (Pydantic)
│   │   ├── db/database.py               # SQLAlchemy async engine
│   │   ├── models/                      # ORM models
│   │   ├── schemas/                     # Pydantic request/response
│   │   ├── api/routes/                  # API endpoints
│   │   └── services/
│   │       ├── telegram_bot.py          # Telegram polling + conversation
│   │       ├── llm.py                   # OpenRouter LLM client
│   │       └── llm_parser.py            # Feedback JSON extraction
│   ├── seed.py                          # Database seeder (demo data)
│   └── requirements.txt
├── frontend/
│   ├── app/                             # Next.js pages
│   ├── components/                      # UI components
│   ├── lib/api.ts                       # API client
│   └── package.json
├── .env                                 # Root env (reference)
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/feedback` | Store feedback from agent |
| `POST` | `/api/feedback/trigger` | Trigger Telegram conversation |
| `GET` | `/api/feedback` | List feedback records |
| `GET` | `/api/features` | All features with health scores |
| `GET` | `/api/features/{id}/timeline` | Sentiment timeline (30 days) |
| `GET` | `/api/features/{id}/tags` | Top friction tags |
| `GET` | `/api/cohorts` | Cohort breakdown by time-of-day |
| `GET` | `/api/digest/weekly` | Latest weekly digest |
| `GET` | `/api/digest/weekly/all` | All weekly digests |
| `POST` | `/api/digest/weekly` | Post digest from agent |
| `GET` | `/api/ota/event` | List OTA events |
| `POST` | `/api/ota/event` | Register OTA event |
| `GET` | `/api/ota/correlation` | Before/after sentiment per OTA |
| `GET` | `/api/health` | Server health check |

---

## Anti-Interrupt Rules

Before triggering a feedback session, the agent checks:

| Condition | Action |
|-----------|--------|
| `stress_score > 75` | Defer 2 hours, log reason |
| `time_of_day == "night"` (23:00–07:00) | Defer to morning |
| `battery_level < 15%` | Skip entirely |
| Same feature within 6 hours | Skip (deduplication) |
| User replied "not now" / "busy" | Defer 2 hours |

All deferrals logged to: `agent/memory/deferred_sessions.yaml`

---

## What Is Mocked

**Only Samsung Health biometric data is mocked.** Everything else is real.

In `health-context.js`, the following values are randomly generated:
- `stress_score`: 20–85
- `sleep_score`: 45–95
- `heart_rate`: 58–95 bpm
- `steps_today`: 800–12,000
- `battery_level`: reads from Android if possible, else random 15–95
- `time_of_day`: derived from real system clock
- `is_charging`: random boolean

The code contains a clear comment:
```javascript
// MOCK: Replace this block with Samsung Health SDK when available
```

---

## Galaxy AI Feature Registry

| Package Name | Feature |
|-------------|---------|
| `com.samsung.android.photostudio` | AI Photo Erase |
| `com.samsung.android.app.notes` | Note Assist |
| `com.samsung.android.wallpaper.res` | AI Wallpaper |
| `com.samsung.android.livestranslate` | Live Translate |
| `com.google.android.googlequicksearchbox` | Circle to Search |

---

## Deployment

### Backend (Render)
The repo includes `render.yaml`. Connect your GitHub repo to [Render.com](https://render.com) for automatic deployment.

### Frontend (Vercel)
Import the repo at [Vercel.com](https://vercel.com). It auto-detects Next.js.

> **Note:** Update `BACKEND_URL` in agent `.env` files to point to your deployed Render URL.

---

## Phone Agent Setup (Termux)

1. Install [Termux](https://f-droid.org/en/packages/com.termux/) from F-Droid
2. Install [Termux:API](https://f-droid.org/en/packages/com.termux.api/) for UsageStats access
3. Grant Usage Access permission: `Settings → Apps → Usage Access → Termux`
4. Run:
```bash
pkg update && pkg upgrade -y && pkg install nodejs git termux-api -y
git clone https://github.com/vishwapanchal/GalaxyPulse.git
cd GalaxyPulse/agent
npm install
```
5. Configure `agent/.env` with your tokens
6. Test: `node telegram-test.js`
7. Run agent: `node skills/feedback-conductor.js`

---

*Built for the PRISM OpenClaw Hackathon · May 2026*

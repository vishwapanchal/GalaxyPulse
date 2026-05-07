# GalaxyPulse — Monorepo
## Contextual micro-feedback harvesting for Samsung Galaxy AI features

---

## Project Structure

```
galaxypulse/
├── backend/          # Python FastAPI backend
├── frontend/         # Next.js 15 dashboard
├── agent/            # OpenClaw skill files + memory
│   ├── skills/       # feature-watcher.js, health-context.js, etc.
│   ├── memory/       # YAML feedback files
│   ├── SOUL.md       # Agent persona
│   └── HEARTBEAT.md  # Agent heartbeat schedule
└── IMPLEMENTATION_PLAN.md
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |

---

## Backend Setup

```powershell
cd backend
py -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Start the API server (will automatically create SQLite db)
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## Frontend Setup

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Dashboard available at: http://localhost:3000

---

## Phone Agent Setup (Termux)

1. Install Termux on your Android phone.
2. Run `pkg update && pkg upgrade -y && pkg install nodejs git -y`
3. Clone the repo: `git clone https://github.com/vishwapanchal/GalaxyPulse.git`
4. Run:
```bash
cd GalaxyPulse/agent
npm install
node skills/feedback-conductor.js
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/feedback` | Store feedback from OpenClaw agent |
| GET | `/api/feedback` | List feedback records |
| GET | `/api/features` | All features with health scores |
| GET | `/api/features/{id}/timeline` | Sentiment timeline (30 days) |
| GET | `/api/features/{id}/tags` | Top friction tags |
| GET | `/api/cohorts` | Cohort breakdown |
| GET | `/api/digest/weekly` | Latest weekly digest |
| POST | `/api/digest/weekly` | Post digest from agent |
| GET | `/api/ota/event` | List OTA events |
| POST | `/api/ota/event` | Register OTA event |
| GET | `/api/ota/correlation` | Before/after sentiment per OTA |
| GET | `/api/health` | Server health check |

---

## Deployment (Hackathon Ready)

- **Backend**: We included a `render.yaml` file in the root. Simply connect your GitHub repository to [Render.com](https://render.com) and it will automatically deploy the FastAPI server using SQLite.
- **Frontend**: Go to [Vercel.com](https://vercel.com), import your GitHub repository, and click Deploy. It will automatically detect Next.js.
  - *Make sure to update the `agent/skills/*.js` files to point to your new Render URL instead of `http://localhost:8000`!*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Runtime | OpenClaw (Termux, Android) |
| LLM | Claude API (claude-sonnet-4) |
| Backend | Python 3.11+ + FastAPI + SQLAlchemy |
| Database | SQLite (aiosqlite driver) |
| Frontend | Next.js 15 + Tailwind CSS + Recharts |
| Deployment | Render (backend) + Vercel (frontend) |

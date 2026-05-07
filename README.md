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
| PostgreSQL | 15+ | [postgresql.org](https://postgresql.org) |

---

## Backend Setup

```powershell
cd backend
py -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in environment variables
copy .env.example .env

# Run migrations / create tables (auto on startup in dev)
# Seed mock data
.\venv\Scripts\python seed.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Dashboard available at: http://localhost:3000

> **Note:** The Next.js dev server proxies all `/api/*` requests to the FastAPI backend at port 8000 automatically.

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Runtime | OpenClaw (Termux, Android) |
| LLM | Claude API (claude-sonnet-4) |
| Backend | Python 3.14 + FastAPI + SQLAlchemy |
| Database | PostgreSQL (asyncpg driver) |
| Frontend | Next.js 15 + Tailwind CSS + Recharts |
| Deployment | Railway (backend) + Vercel (frontend) |

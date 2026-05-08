from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.core.config import settings
from app.db.database import create_tables
from app.api.routes import feedback, features, ota, digest, cohorts


from app.services.telegram_bot import start_telegram_bot, stop_telegram_bot
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("🚀 GalaxyPulse backend starting up...")
    await create_tables()
    logger.info("✅ Database tables ready")
    await start_telegram_bot()
    start_scheduler()          # ← autonomous jobs: pings, alerts, digest
    yield
    stop_scheduler()
    await stop_telegram_bot()
    logger.info("🛑 GalaxyPulse backend shutting down")



app = FastAPI(
    title="GalaxyPulse API",
    description=(
        "Contextual micro-feedback harvesting system for Samsung Galaxy AI features. "
        "Receives feedback from the OpenClaw Android agent and serves the PM dashboard."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(feedback.router)
app.include_router(features.router)
app.include_router(ota.router)
app.include_router(digest.router)
app.include_router(cohorts.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "GalaxyPulse API", "version": "1.0.0"}


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "GalaxyPulse API — see /docs for the full API reference"}


# ── Scheduler debug endpoints (demo helpers) ──────────────────────────────────
@app.post("/api/scheduler/ping-now", tags=["Scheduler"])
async def trigger_ping_now():
    """Immediately trigger a proactive feedback ping (for demo/testing)."""
    from app.services.scheduler import job_proactive_ping
    await job_proactive_ping()
    return {"status": "ping sent"}


@app.post("/api/scheduler/digest-now", tags=["Scheduler"])
async def trigger_digest_now():
    """Immediately generate and send the weekly digest (for demo/testing)."""
    from app.services.scheduler import job_weekly_digest
    await job_weekly_digest()
    return {"status": "digest generated"}


@app.post("/api/scheduler/health-alert-now", tags=["Scheduler"])
async def trigger_health_alert_now():
    """Immediately run health alert check (for demo/testing)."""
    from app.services.scheduler import job_health_alert
    await job_health_alert()
    return {"status": "health alert checked"}


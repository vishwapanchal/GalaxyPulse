"""
GalaxyPulse Autonomous Scheduler
─────────────────────────────────
Runs inside FastAPI's async event loop. No manual commands needed.

Jobs:
  1. Proactive ping     — every 4 hours (waking hours only)
                          Picks a feature from the known registry and
                          asks the user for feedback — simulating what
                          the Android UsageStats API would trigger.
  2. Health alert       — every 2 hours
                          If any feature health score drops below 45,
                          DMs the PM with an alert.
  3. Weekly digest      — every Monday at 09:00 local time
                          LLM summarises the week's feedback and posts
                          a digest to the PM chat + stores in DB.

On a real Samsung device the proactive ping trigger is replaced by the
OpenClaw Node.js agent (feature-watcher.js) which polls UsageStats and
calls POST /api/feedback/trigger when a Galaxy AI app closes.
"""

import asyncio
import random
from datetime import datetime, timezone, date, timedelta
from loguru import logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings

# ── Feature pool for proactive pings ─────────────────────────────────────────
FEATURE_POOL = [
    "Google Lens",
    "Google Translate AI",
    "Google Photos AI",
    "Circle to Search",
    "Gboard Smart Compose",
    "Text-to-Speech AI",
    "AI Photo Erase",
    "Note Assist",
    "Live Translate",
    "AI Wallpaper",
]

_scheduler: AsyncIOScheduler | None = None


# ── Job 1: Proactive feedback ping ────────────────────────────────────────────
async def job_proactive_ping():
    """
    Simulate the Android UsageStats trigger:
    Pick a random feature and send a feedback request to the user.
    On a real device, this is replaced by the OpenClaw agent.
    """
    from app.services.telegram_bot import trigger_conversation, generate_health_context, tg_application

    if not tg_application:
        logger.debug("Proactive ping skipped — Telegram bot not running")
        return

    chat_id_str = settings.TELEGRAM_CHAT_ID
    if not chat_id_str:
        logger.warning("TELEGRAM_CHAT_ID not set — skipping proactive ping")
        return

    health = generate_health_context()

    # Respect anti-interrupt rules
    if health["time_of_day"] == "night":
        logger.info("Proactive ping suppressed — night time")
        return
    if health["stress_score"] > 75:
        logger.info(f"Proactive ping suppressed — high stress ({health['stress_score']})")
        return
    if health["battery_level"] < 15:
        logger.info("Proactive ping suppressed — low battery proxy")
        return

    feature = random.choice(FEATURE_POOL)
    chat_id = int(chat_id_str)

    logger.info(f"🤖 Autonomous ping → chat {chat_id} for feature: {feature}")
    await trigger_conversation(chat_id, feature, health)


# ── Job 2: Feature health alert ───────────────────────────────────────────────
async def job_health_alert():
    """Check all feature health scores and alert PM if any drop below threshold."""
    from app.services.telegram_bot import tg_application
    from app.db.database import AsyncSessionLocal
    from app.models.feature import FeatureHealth
    from sqlalchemy import select

    if not tg_application:
        return

    pm_chat_str = settings.PM_TELEGRAM_CHAT_ID or settings.TELEGRAM_CHAT_ID
    if not pm_chat_str:
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FeatureHealth).where(FeatureHealth.health_score < 45)
        )
        critical = result.scalars().all()

    if not critical:
        return

    lines = ["⚠️ *GalaxyPulse Health Alert*\n"]
    for f in critical:
        lines.append(
            f"🔴 *{f.feature_name}* — score: {f.health_score:.0f}/100 "
            f"| avg sat: {f.avg_satisfaction_7d:.1f}/5 "
            f"| friction: {f.friction_rate*100:.0f}%"
        )
    lines.append("\nOpen the dashboard for details.")

    try:
        await tg_application.bot.send_message(
            chat_id=int(pm_chat_str),
            text="\n".join(lines),
            parse_mode="Markdown",
        )
        logger.info(f"📣 Health alert sent for {len(critical)} features")
    except Exception as e:
        logger.warning(f"Failed to send health alert: {e}")


# ── Job 3: Weekly digest ───────────────────────────────────────────────────────
async def job_weekly_digest():
    """
    Every Monday 09:00 — LLM reads all feedback from the past 7 days,
    generates a structured digest, stores it in DB, and messages the PM.
    """
    from app.services.telegram_bot import tg_application
    from app.services.llm import generate_weekly_digest
    from app.db.database import AsyncSessionLocal
    from app.models.feedback import FeedbackRecord
    from app.models.digest import WeeklyDigest
    from sqlalchemy import select
    import yaml
    import json

    if not tg_application:
        logger.warning("Weekly digest skipped — Telegram bot not running")
        return

    pm_chat_str = settings.PM_TELEGRAM_CHAT_ID or settings.TELEGRAM_CHAT_ID
    if not pm_chat_str:
        return

    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FeedbackRecord).where(FeedbackRecord.timestamp >= cutoff)
        )
        records = result.scalars().all()

        if not records:
            logger.info("Weekly digest: no data for past 7 days")
            return

        # Serialize feedback to YAML for the LLM context
        yaml_lines = []
        for r in records:
            yaml_lines.append(yaml.dump({
                "feature": r.feature_name,
                "satisfaction": r.satisfaction,
                "friction": r.friction,
                "sentiment": r.sentiment,
                "tags": r.auto_tags,
                "verbatim": r.verbatim_q1,
                "time_of_day": r.time_of_day,
                "stress": r.stress_score,
            }, default_flow_style=True))
        yaml_content = "\n".join(yaml_lines)

        logger.info(f"📊 Generating weekly digest for {len(records)} feedback records...")
        digest_data = await generate_weekly_digest(yaml_content, week_start)

        # Store in DB
        existing = await db.execute(
            select(WeeklyDigest).where(WeeklyDigest.week_start == week_start)
        )
        old = existing.scalar_one_or_none()
        if old:
            old.top_issues = digest_data.get("top_issues", [])
            old.sentiment_changes = digest_data.get("sentiment_changes", {})
            old.novelty_flags = digest_data.get("novelty_flags", [])
            old.ota_correlations = digest_data.get("ota_correlations", [])
        else:
            db.add(WeeklyDigest(
                week_start=week_start,
                top_issues=digest_data.get("top_issues", []),
                sentiment_changes=digest_data.get("sentiment_changes", {}),
                novelty_flags=digest_data.get("novelty_flags", []),
                ota_correlations=digest_data.get("ota_correlations", []),
            ))
        await db.commit()

    # Format Telegram message for PM
    top = digest_data.get("top_issues", [])[:3]
    novel = digest_data.get("novelty_flags", [])

    msg_lines = [
        f"📋 *GalaxyPulse Weekly Digest* — Week of {week_start}\n",
        f"📊 Based on *{len(records)} feedback sessions*\n",
    ]
    if top:
        msg_lines.append("🔥 *Top Issues:*")
        for i, issue in enumerate(top, 1):
            msg_lines.append(
                f"  {i}. {issue.get('feature','?')} — {issue.get('issue','?')} "
                f"[{issue.get('severity','?')}]"
            )
    if novel:
        msg_lines.append(f"\n✨ *New patterns:* {', '.join(novel[:3])}")

    msg_lines.append("\n_Full digest available on the dashboard._")

    try:
        await tg_application.bot.send_message(
            chat_id=int(pm_chat_str),
            text="\n".join(msg_lines),
            parse_mode="Markdown",
        )
        logger.info("📋 Weekly digest sent to PM")
    except Exception as e:
        logger.warning(f"Failed to send digest message: {e}")


# ── Scheduler lifecycle ───────────────────────────────────────────────────────
def start_scheduler() -> AsyncIOScheduler:
    global _scheduler

    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    # Proactive ping — every 4 hours between 08:00 and 22:00
    scheduler.add_job(
        job_proactive_ping,
        trigger=CronTrigger(hour="8,12,16,20", minute=0),
        id="proactive_ping",
        name="Proactive feedback ping",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Health alert — every 2 hours
    scheduler.add_job(
        job_health_alert,
        trigger=IntervalTrigger(hours=2),
        id="health_alert",
        name="Feature health alert",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Weekly digest — every Monday at 09:00
    scheduler.add_job(
        job_weekly_digest,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_digest",
        name="Weekly LLM digest",
        replace_existing=True,
        misfire_grace_time=600,
    )

    scheduler.start()
    _scheduler = scheduler

    logger.info("⏰ Autonomous scheduler started — 3 jobs active:")
    logger.info("   • Proactive pings: 08:00, 12:00, 16:00, 20:00 daily")
    logger.info("   • Health alerts:   every 2 hours")
    logger.info("   • Weekly digest:   every Monday 09:00")

    return scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("⏰ Scheduler stopped")

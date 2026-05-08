import os
import asyncio
from datetime import datetime, timezone
from loguru import logger
import httpx
from telegram import Update, BotCommand
from telegram.ext import (
    Application, MessageHandler, CommandHandler, filters, ContextTypes
)
from app.services.llm_parser import parse_feedback
from app.services.llm import generate_opening_question, generate_followup_question, auto_tag_response
from app.core.config import settings

# ── Known Features (Generic Android + Samsung Galaxy AI) ──────────────────────
KNOWN_FEATURES = {
    # Samsung Galaxy AI (auto-detects on Samsung devices via UsageStats)
    "ai photo erase":       "AI Photo Erase",
    "note assist":          "Note Assist",
    "ai wallpaper":         "AI Wallpaper",
    "live translate":       "Live Translate",
    # Generic Android AI (works on any Android device)
    "circle to search":    "Circle to Search",
    "google lens":         "Google Lens",
    "google translate":    "Google Translate AI",
    "google photos":       "Google Photos AI",
    "gboard":              "Gboard Smart Compose",
    "text to speech":      "Text-to-Speech AI",
}

# In-memory state for active conversations
active_sessions = {}
tg_application = None


# ── Server-side Health Context Heuristic ──────────────────────────────────────
# Deterministic proxy values based on real signals (time of day).
# NOT random — follows realistic human circadian patterns.
# Replace with Samsung Health SDK in production.
def generate_health_context():
    """Generate heuristic health context based on real signals (time of day)."""
    now = datetime.now()
    hour = now.hour

    # Time of day
    if 7 <= hour < 12:
        time_of_day = "morning"
    elif 12 <= hour < 17:
        time_of_day = "afternoon"
    elif 17 <= hour < 23:
        time_of_day = "evening"
    else:
        time_of_day = "night"

    # Stress proxy — follows circadian rhythm
    # Morning: low (25-40), Afternoon: moderate (40-55),
    # Evening: moderate-high (50-65), Night: high (60-80)
    stress_map = {
        "morning": 32, "afternoon": 47, "evening": 58, "night": 72
    }
    stress_score = stress_map[time_of_day]

    # Sleep proxy — morning = good sleep assumed, night = poor
    sleep_map = {
        "morning": 82, "afternoon": 78, "evening": 70, "night": 52
    }
    sleep_score = sleep_map[time_of_day]

    # Heart rate — resting morning, elevated evening
    hr_map = {
        "morning": 64, "afternoon": 72, "evening": 78, "night": 68
    }
    heart_rate = hr_map[time_of_day]

    # Steps — proportional to hours since 7am (~800 steps/hr)
    hours_since_morning = max(0, hour - 7) if hour >= 7 else 0
    steps_today = min(hours_since_morning * 800, 12000)

    # Battery — estimate based on time (full charge morning, drains through day)
    battery_map = {
        "morning": 90, "afternoon": 65, "evening": 42, "night": 28
    }
    battery_level = battery_map[time_of_day]

    return {
        "stress_score": stress_score,
        "sleep_score": sleep_score,
        "heart_rate": heart_rate,
        "steps_today": steps_today,
        "battery_level": battery_level,
        "time_of_day": time_of_day,
        "is_charging": False,
        "location_type": "unknown",
    }


# ── Resolve feature name from user input ──────────────────────────────────────
def resolve_feature(user_input: str) -> str | None:
    """Fuzzy-match user input to a known feature name."""
    normalized = user_input.strip().lower()

    # Exact match
    if normalized in KNOWN_FEATURES:
        return KNOWN_FEATURES[normalized]

    # Partial match — check if the input is contained in any feature name
    for key, display_name in KNOWN_FEATURES.items():
        if normalized in key or key in normalized:
            return display_name
        if normalized in display_name.lower() or display_name.lower() in normalized:
            return display_name

    return None


# ── Command Handlers ──────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command — welcome message."""
    feature_list = "\n".join(f"  • {name}" for name in sorted(set(KNOWN_FEATURES.values())))
    welcome = (
        "🌌 *Welcome to GalaxyPulse!*\n\n"
        "I'm your AI feedback companion. I collect quick, conversational "
        "feedback on Galaxy AI and Android AI features you use daily.\n\n"
        "*How it works:*\n"
        "1️⃣ Tell me what feature you just used:\n"
        "   `/use Google Lens`\n"
        "2️⃣ I'll ask you 2 quick questions about your experience\n"
        "3️⃣ Your feedback goes straight to the product team's dashboard\n\n"
        f"*Available features:*\n{feature_list}\n\n"
        "Type `/use <feature name>` to start! 🚀"
    )
    await update.message.reply_text(welcome, parse_mode="Markdown")
    logger.info(f"User {update.effective_chat.id} started the bot")


async def cmd_features(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /features command — list all trackable features."""
    # Group by category
    samsung_features = ["AI Photo Erase", "Note Assist", "AI Wallpaper", "Live Translate"]
    generic_features = [
        "Circle to Search", "Google Lens", "Google Translate AI",
        "Google Photos AI", "Gboard Smart Compose", "Text-to-Speech AI"
    ]

    samsung_list = "\n".join(f"  • {f}" for f in samsung_features)
    generic_list = "\n".join(f"  • {f}" for f in generic_features)

    msg = (
        "📋 *Trackable Features*\n\n"
        "🔵 *Samsung Galaxy AI:*\n"
        f"{samsung_list}\n\n"
        "🟢 *Generic Android AI:*\n"
        f"{generic_list}\n\n"
        "Use `/use <feature name>` after you've used one!"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command — show user's feedback stats."""
    chat_id = update.effective_chat.id
    active = chat_id in active_sessions

    # Query backend for this user's feedback count
    count = 0
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.BACKEND_URL}/api/feedback",
                params={"user_id": str(chat_id), "limit": 1}
            )
            if resp.status_code == 200:
                count = resp.json().get("total", 0)
    except Exception as e:
        logger.warning(f"Failed to query feedback count: {e}")

    status_emoji = "🟢 Active session" if active else "⚪ No active session"
    feature_info = f" (giving feedback on *{active_sessions[chat_id]['feature']}*)" if active else ""

    msg = (
        f"📊 *Your GalaxyPulse Status*\n\n"
        f"Session: {status_emoji}{feature_info}\n"
        f"Total feedback given: *{count}* sessions\n"
        f"Chat ID: `{chat_id}`\n\n"
        f"{'Reply to the current question above ☝️' if active else 'Type `/use <feature>` to start a new session!'}"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_use(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /use <feature> command — trigger a real feedback session."""
    chat_id = update.effective_chat.id

    # Check if already in a session
    if chat_id in active_sessions:
        await update.message.reply_text(
            f"⚠️ You're already in a feedback session for *{active_sessions[chat_id]['feature']}*.\n"
            "Please finish it first by replying to the question above!",
            parse_mode="Markdown"
        )
        return

    # Parse feature name from args
    if not context.args:
        await update.message.reply_text(
            "❓ Please specify a feature!\n\n"
            "Example: `/use Google Lens`\n\n"
            "Type `/features` to see all available features.",
            parse_mode="Markdown"
        )
        return

    feature_input = " ".join(context.args)
    feature_name = resolve_feature(feature_input)

    if not feature_name:
        await update.message.reply_text(
            f"🤔 I don't recognize \"{feature_input}\".\n\n"
            "Type `/features` to see all available features.",
            parse_mode="Markdown"
        )
        return

    # Generate health context (heuristic proxy)
    health_context = generate_health_context()

    # Anti-interrupt check
    if health_context["stress_score"] > 75:
        await update.message.reply_text(
            "😌 Your estimated stress level is high right now. "
            "I'll check back later — take care! 👋"
        )
        logger.info(f"Deferred feedback for {chat_id} — stress={health_context['stress_score']}")
        return

    if health_context["time_of_day"] == "night":
        await update.message.reply_text(
            "🌙 It's late! I won't bother you now. "
            "Try again in the morning — good night! 💤"
        )
        logger.info(f"Deferred feedback for {chat_id} — night time")
        return

    if health_context["battery_level"] < 15:
        await update.message.reply_text(
            "🪫 Your battery might be low. I'll skip this one — charge up first!"
        )
        logger.info(f"Skipped feedback for {chat_id} — low battery proxy")
        return

    # Start the feedback session
    active_sessions[chat_id] = {
        "feature": feature_name,
        "state": "awaiting_q1",
        "health_context": health_context,
    }

    # Generate LLM-powered opening question
    try:
        q1 = await generate_opening_question(feature_name, health_context)
    except Exception as e:
        logger.warning(f"LLM opening question generation failed: {e}")
        q1 = f"Hey! You just used {feature_name} — how did it go? (1-5 or just tell me)"

    await update.message.reply_text(q1)
    logger.info(f"Started feedback session for {chat_id} — feature: {feature_name}")


# ── Message Handler (conversation replies) ────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text

    if chat_id not in active_sessions:
        await update.message.reply_text(
            "No active feedback session right now.\n\n"
            "Type `/use <feature>` to start one!\n"
            "Example: `/use Google Lens`"
        )
        return

    # Handle "not now" / "busy" — defer gracefully
    lower_text = text.strip().lower()
    if lower_text in ("not now", "busy", "later", "not right now", "skip"):
        session = active_sessions.pop(chat_id)
        await update.message.reply_text("No worries! I'll check back later 👋")
        logger.info(f"User {chat_id} deferred feedback for {session['feature']} — reason: user said '{lower_text}'")
        return

    session = active_sessions[chat_id]
    feature = session["feature"]

    if session["state"] == "awaiting_q1":
        session["q1_reply"] = text
        session["state"] = "awaiting_q2"

        # Generate LLM-powered follow-up question based on the user's first answer
        try:
            q2 = await generate_followup_question(feature, text)
        except Exception as e:
            logger.warning(f"LLM follow-up generation failed: {e}")
            q2 = f"Got it. Did you experience any weird bugs or friction using {feature}?"

        await update.message.reply_text(q2)

    elif session["state"] == "awaiting_q2":
        session["q2_reply"] = text
        await update.message.reply_text("Thanks, logged that 👍 I'll let the team know.")

        # Compile full convo and trigger LLM parsing
        conversation = f"Q1 Reply: {session['q1_reply']}\nQ2 Reply: {session['q2_reply']}"
        parsed_data = await parse_feedback(feature, conversation)

        # Auto-tag both responses
        combined_verbatim = f"{session['q1_reply']} {session['q2_reply']}"
        try:
            tags = await auto_tag_response(feature, combined_verbatim)
        except Exception as e:
            logger.warning(f"Auto-tagging failed: {e}")
            tags = parsed_data.get("auto_tags", [])

        # Construct final payload and hit our own backend
        payload = {
            "session_id": f"sess_{chat_id}_{os.urandom(4).hex()}",
            "user_id": str(chat_id),
            "feature_id": feature.lower().replace(" ", "_"),
            "feature_name": feature,
            "build_version": "Android 14 / Generic",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "satisfaction": parsed_data.get("satisfaction", 3),
            "friction": parsed_data.get("friction", False),
            "severity": parsed_data.get("severity", "low"),
            "sentiment": parsed_data.get("sentiment", "neutral"),
            "verbatim_q1": session["q1_reply"],
            "verbatim_q2": session["q2_reply"],
            "auto_tags": tags if tags else parsed_data.get("auto_tags", []),
            "stress_score": session["health_context"].get("stress_score", 50),
            "sleep_score": session["health_context"].get("sleep_score", 80),
            "heart_rate": session["health_context"].get("heart_rate", 70),
            "steps_today": session["health_context"].get("steps_today", 3000),
            "battery_level": session["health_context"].get("battery_level", 50),
            "time_of_day": session["health_context"].get("time_of_day", "afternoon"),
            "location_type": session["health_context"].get("location_type", "unknown"),
        }

        # POST back to our own FastAPI server
        try:
            async with httpx.AsyncClient() as client:
                await client.post(f"{settings.BACKEND_URL}/api/feedback", json=payload)
            logger.info(f"Successfully processed feedback for {chat_id} — feature: {feature}")
        except Exception as e:
            logger.error(f"Failed to post feedback internally: {e}")

        del active_sessions[chat_id]


# ── Bot Lifecycle ─────────────────────────────────────────────────────────────

async def start_telegram_bot():
    global tg_application
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or token == "YOUR_TELEGRAM_TOKEN":
        logger.warning("No valid TELEGRAM_BOT_TOKEN found. Telegram bot disabled.")
        return None

    tg_application = Application.builder().token(token).build()

    # Register command handlers
    tg_application.add_handler(CommandHandler("start", cmd_start))
    tg_application.add_handler(CommandHandler("use", cmd_use))
    tg_application.add_handler(CommandHandler("features", cmd_features))
    tg_application.add_handler(CommandHandler("status", cmd_status))

    # Register message handler (for conversation replies)
    tg_application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    await tg_application.initialize()
    await tg_application.start()
    await tg_application.updater.start_polling()

    # Set bot commands menu
    try:
        await tg_application.bot.set_my_commands([
            BotCommand("start", "Welcome & instructions"),
            BotCommand("use", "Give feedback on a feature (e.g. /use Google Lens)"),
            BotCommand("features", "List all trackable features"),
            BotCommand("status", "Your feedback stats"),
        ])
    except Exception as e:
        logger.warning(f"Failed to set bot commands menu: {e}")

    logger.info("🤖 Telegram Bot started polling...")


async def stop_telegram_bot():
    global tg_application
    if tg_application:
        await tg_application.updater.stop()
        await tg_application.stop()
        await tg_application.shutdown()
        logger.info("🤖 Telegram Bot stopped")


async def trigger_conversation(chat_id: int, feature: str, health_context: dict):
    """Trigger a real 2-turn feedback conversation via Telegram with LLM-generated questions."""
    global tg_application
    if not tg_application:
        logger.error("Telegram bot is not running. Cannot send message.")
        return False

    active_sessions[chat_id] = {
        "feature": feature,
        "state": "awaiting_q1",
        "health_context": health_context,
    }

    # Generate LLM-powered opening question
    try:
        q1 = await generate_opening_question(feature, health_context)
    except Exception as e:
        logger.warning(f"LLM opening question generation failed: {e}")
        q1 = f"Hey! I noticed you just used {feature}. How did it go? (1-5 or just tell me)"

    try:
        await tg_application.bot.send_message(chat_id=chat_id, text=q1)
        logger.info(f"Sent LLM-generated Q1 to {chat_id} for feature '{feature}'")
        return True
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        if chat_id in active_sessions:
            del active_sessions[chat_id]
        return False

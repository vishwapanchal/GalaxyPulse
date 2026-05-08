import os
import asyncio
from loguru import logger
import httpx
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
from app.services.llm_parser import parse_feedback
from app.services.llm import generate_opening_question, generate_followup_question, auto_tag_response
from app.core.config import settings

# In-memory state for active conversations
active_sessions = {}
tg_application = None

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text
    
    if chat_id not in active_sessions:
        await update.message.reply_text("No active feedback session for you right now.")
        return
    
    # Handle "not now" / "busy" — defer gracefully
    lower_text = text.strip().lower()
    if lower_text in ("not now", "busy", "later", "not right now"):
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
            "build_version": "One UI 7.0 / May OTA",
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
            "location_type": session["health_context"].get("location_type", "unknown")
        }
        
        # POST back to our own FastAPI server
        try:
            async with httpx.AsyncClient() as client:
                await client.post(f"{settings.BACKEND_URL}/api/feedback", json=payload)
            logger.info(f"Successfully processed feedback for {chat_id} — feature: {feature}")
        except Exception as e:
            logger.error(f"Failed to post feedback internally: {e}")
            
        del active_sessions[chat_id]

async def start_telegram_bot():
    global tg_application
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or token == "YOUR_TELEGRAM_TOKEN":
        logger.warning("No valid TELEGRAM_BOT_TOKEN found. Telegram bot disabled.")
        return None
        
    tg_application = Application.builder().token(token).build()
    tg_application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    await tg_application.initialize()
    await tg_application.start()
    await tg_application.updater.start_polling()
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
        "health_context": health_context
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

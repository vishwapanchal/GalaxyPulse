from app.core.config import settings
print("TOKEN:", repr(settings.TELEGRAM_BOT_TOKEN))
print("CHAT_ID:", repr(settings.TELEGRAM_CHAT_ID))
print("OPENROUTER:", repr(settings.OPENROUTER_API_KEY[:10] if settings.OPENROUTER_API_KEY else "empty"))

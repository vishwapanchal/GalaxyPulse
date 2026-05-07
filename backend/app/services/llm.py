"""
GalaxyPulse LLM Service — OpenRouter Client
Uses the OpenAI-compatible API pointed at OpenRouter.
Primary model: google/gemini-2.0-flash-exp:free
Fallback model: meta-llama/llama-4-maverick:free
"""
from openai import AsyncOpenAI
from app.core.config import settings
from loguru import logger
import json
import re

# ── OpenRouter client ─────────────────────────────────────────────────────────
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
    default_headers={
        "HTTP-Referer": "https://galaxypulse.app",
        "X-Title": "GalaxyPulse",
    },
)

PRIMARY_MODEL  = settings.LLM_PRIMARY_MODEL
FALLBACK_MODEL = settings.LLM_FALLBACK_MODEL


async def _chat(messages: list[dict], model: str = PRIMARY_MODEL, temperature: float = 0.7) -> str:
    """Low-level chat completion with automatic fallback."""
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=1024,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        if model == PRIMARY_MODEL:
            logger.warning(f"Primary model failed ({e}), falling back to {FALLBACK_MODEL}")
            return await _chat(messages, model=FALLBACK_MODEL, temperature=temperature)
        raise


# ── Task 1: Generate opening feedback question ────────────────────────────────
async def generate_opening_question(feature_name: str, health_context: dict) -> str:
    """Generate a warm, casual opening question for a feedback session."""
    time_of_day = health_context.get("time_of_day", "today")
    stress = health_context.get("stress_score", 50)
    tone = "quick and light" if stress > 60 else "conversational and friendly"

    messages = [
        {
            "role": "system",
            "content": (
                "You are GalaxyPulse, a friendly Samsung AI companion collecting feedback. "
                "Keep it casual, warm, max 1-2 sentences. Never use survey language. "
                "Always end with an open question or a 1-5 option."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Generate a {tone} opening question for a user who just used '{feature_name}' "
                f"this {time_of_day}. Ask how the experience went."
            ),
        },
    ]
    return await _chat(messages, temperature=0.8)


# ── Task 2: Generate follow-up question based on first answer ─────────────────
async def generate_followup_question(feature_name: str, first_answer: str) -> str:
    """Generate a probing follow-up question based on the user's first response."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are GalaxyPulse. Based on the user's first feedback, generate ONE short "
                "follow-up question that digs into the specific friction or delight they mentioned. "
                "Max 1 sentence. Never ask a generic question."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Feature: {feature_name}\n"
                f"User's first response: \"{first_answer}\"\n\n"
                "Generate a targeted follow-up question."
            ),
        },
    ]
    return await _chat(messages, temperature=0.7)


# ── Task 3: Auto-tag user verbatim responses ──────────────────────────────────
TAXONOMY_EXAMPLES = [
    "shadow_artifact", "edge_quality", "multi_attempt", "brush_precision",
    "slow_response", "wrong_result", "generation_quality", "style_mismatch",
    "translation_error", "latency", "summary_accuracy", "color_bleed",
    "ui_lag", "good_accuracy", "missed_words", "context_mismatch",
]

async def auto_tag_response(feature_name: str, verbatim: str) -> list[str]:
    """Extract 2-5 structured tags from a user's free-text response."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a feedback analyst for Samsung Galaxy AI features. "
                "Extract 2-5 concise snake_case tags from the user's response that describe "
                "the specific issue or positive aspect mentioned. "
                f"Use tags similar to this taxonomy where applicable: {TAXONOMY_EXAMPLES}. "
                "Return ONLY a valid JSON array of strings. No explanation."
            ),
        },
        {
            "role": "user",
            "content": f"Feature: {feature_name}\nUser said: \"{verbatim}\"\n\nReturn JSON array of tags:",
        },
    ]
    raw = await _chat(messages, temperature=0.2)

    # Parse JSON robustly
    try:
        # Strip markdown code fences if present
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        tags = json.loads(cleaned)
        if isinstance(tags, list):
            return [str(t).lower().replace(" ", "_") for t in tags[:5]]
    except json.JSONDecodeError:
        logger.warning(f"Auto-tag JSON parse failed, raw: {raw[:200]}")
    return []


# ── Task 4: Generate weekly digest summary ────────────────────────────────────
async def generate_weekly_digest(feedback_yaml_content: str, week_start: str) -> dict:
    """
    Summarize a week's feedback YAML files into a structured digest JSON.
    Returns: { top_issues, sentiment_changes, novelty_flags, ota_correlations }
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are a Samsung product analytics AI. Analyze the following feedback data "
                "and return a structured JSON summary with these exact keys:\n"
                "- top_issues: list of {feature, issue, count, severity}\n"
                "- sentiment_changes: dict of feature_id → {delta, trend}\n"
                "- novelty_flags: list of new friction patterns not seen before\n"
                "- ota_correlations: list of {feature, build_version, impact}\n"
                "Return ONLY valid JSON, no explanation."
            ),
        },
        {
            "role": "user",
            "content": f"Week: {week_start}\n\nFeedback data:\n{feedback_yaml_content[:8000]}",
        },
    ]
    raw = await _chat(messages, temperature=0.3)

    try:
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"Digest JSON parse failed, raw: {raw[:300]}")
        return {
            "top_issues": [],
            "sentiment_changes": {},
            "novelty_flags": [],
            "ota_correlations": [],
        }

# Weekly Digest Skill

**Purpose:** Aggregate the past week's feedback YAML files, summarize via LLM, post to backend dashboard, and send a Telegram summary to the PM.

**Input:** `{ "week_start": "2026-05-04" }`

**Output:**
```json
{
  "week_start": "2026-05-04",
  "top_issues": [
    { "feature": "AI Photo Erase", "issue": "Shadow artifacts on edges", "count": 12, "severity": "high" }
  ],
  "sentiment_changes": {
    "ai_photo_erase": { "delta": -0.4, "trend": "down" }
  },
  "novelty_flags": [
    "Users reporting battery drain after using AI Wallpaper (new this week)"
  ],
  "ota_correlations": [
    { "feature": "AI Photo Erase", "build_version": "May OTA", "impact": "Negative sentiment spike" }
  ]
}
```

**Flow:**
1. Read all YAML files in `memory/feedback/*/{week_start to +7 days}.yaml`
2. Concatenate and send to OpenRouter LLM (meta-llama/llama-3.3-70b-instruct:free) for structured summarization
3. POST the resulting JSON to `/api/digest/weekly`
4. Send a formatted Telegram message to the PM's chat ID

**Schedule:** Every Monday at 09:00 (triggered by HEARTBEAT)

**Environment Variables:** `OPENROUTER_API_KEY`, `LLM_PRIMARY_MODEL`, `TELEGRAM_BOT_TOKEN`, `PM_TELEGRAM_CHAT_ID`, `BACKEND_URL` (from `agent/.env`)

**Fallback:** If LLM API is unavailable, generates a basic count-based summary without AI analysis.

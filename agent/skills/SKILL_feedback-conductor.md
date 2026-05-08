# Feedback Conductor Skill

**Purpose:** Orchestrate a 2-turn conversational feedback session over Telegram with anti-interrupt intelligence.

**Input:**
```json
{
  "feature": "AI Photo Erase",
  "health_context": {
    "stress_score": 42,
    "sleep_score": 78,
    "heart_rate": 72,
    "steps_today": 3200,
    "battery_level": 67,
    "time_of_day": "afternoon",
    "is_charging": false
  }
}
```

**Output:**
```json
{ "status": "telegram_chat_started", "chat_id": 6536013557 }
```
or
```json
{ "status": "deferred", "reason": "stress_score_high", "reschedule_hours": 2 }
```

**Flow:**
1. Check anti-interrupt rules (stress > 75, night time, battery < 15%)
2. If deferred → log to `memory/deferred_sessions.yaml` and return
3. Write initial YAML to `memory/feedback/{feature_slug}/{YYYY-MM-DD}.yaml`
4. POST to backend `/api/feedback/trigger` → triggers real Telegram conversation
5. Backend's telegram_bot.py handles: LLM Q1 → wait → LLM Q2 → wait → parse → store

**Anti-Interrupt Rules:**
| Condition | Action |
|-----------|--------|
| `stress_score > 75` | Defer 2 hours |
| `time_of_day == "night"` | Defer to morning (8 hours) |
| `battery_level < 15` | Skip entirely |
| User said "not now"/"busy" | Defer 2 hours (handled by backend) |

**Environment Variables:** `BACKEND_URL`, `TELEGRAM_CHAT_ID` (from `agent/.env`)

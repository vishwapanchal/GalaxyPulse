# HEARTBEAT.md — GalaxyPulse

Every 5 minutes:
1. Invoke skill: feature-watcher → get list of Galaxy AI features used in last 10 min
2. If any feature found AND not already triggered within 6 hours:
   a. Invoke skill: health-context → get current stress, sleep score, battery, time of day
   b. Anti-interrupt checks (in order):
      - stress_score > 75 → defer 2 hours, log to memory/deferred_sessions.yaml
      - time_of_day == "night" (23:00–07:00) → defer to morning, log reason
      - battery_level < 15 → skip entirely, log reason
      - user replied "not now" or "busy" to last session → defer 2 hours
   c. If all checks pass: invoke skill: feedback-conductor with {feature, health_context}
3. Every Monday 09:00: invoke skill: weekly-digest → summarize week's YAML feedback,
   post to /api/digest/weekly, send Telegram summary to PM

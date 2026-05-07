# HEARTBEAT.md — GalaxyPulse

Every 5 minutes:
1. Invoke skill: feature-watcher → get list of Galaxy AI features used in last 10 min
2. If any feature found AND not already asked today:
   a. Invoke skill: health-context → get current stress, sleep score, time of day
   b. If stress > 80 or time is 23:00–07:00: log "deferred" and skip
   c. Else: invoke skill: feedback-conductor with {feature, health_context}
3. Every Monday 09:00: invoke skill: weekly-digest → post summary to PM dashboard
4. Every night 00:00: invoke skill: memory-compactor → summarize weekly feedback files

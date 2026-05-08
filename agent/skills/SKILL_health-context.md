# Health Context Skill

**Purpose:** Read current biometric state for anti-interrupt decisions and feedback context enrichment.

**Input:** `{}`

**Output:**
```json
{
  "stress_score": 42,
  "sleep_score": 78,
  "heart_rate": 72,
  "steps_today": 3200,
  "battery_level": 67,
  "time_of_day": "afternoon",
  "is_charging": false
}
```

**Value Ranges:**
| Field | Range | Source |
|-------|-------|--------|
| `stress_score` | 20–85 | MOCK (Samsung Health SDK) |
| `sleep_score` | 45–95 | MOCK (Samsung Health SDK) |
| `heart_rate` | 58–95 bpm | MOCK (Samsung Health SDK) |
| `steps_today` | 800–12,000 | MOCK (Samsung Health SDK) |
| `battery_level` | 15–95% | Android system (`termux-battery-status`) or MOCK |
| `time_of_day` | morning/afternoon/evening/night | REAL (system clock) |
| `is_charging` | true/false | MOCK |

**Time of Day Boundaries:**
- morning: 07:00–11:59
- afternoon: 12:00–16:59
- evening: 17:00–22:59
- night: 23:00–06:59

**Mock Notice:** All Samsung Health values are mocked. Replace the mock block with Samsung Health SDK integration when available. The code contains a clear `// MOCK: Replace this block with Samsung Health SDK when available` comment.

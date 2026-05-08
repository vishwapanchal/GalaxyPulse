# Feature Watcher Skill

**Purpose:** Monitor Android UsageStats API for Galaxy AI feature usage.

**Input:** `{ "lookback_minutes": 10 }`

**Output:** Array of detected features:
```json
[
  {
    "package": "com.samsung.android.photostudio",
    "feature_name": "AI Photo Erase",
    "duration_sec": 45,
    "timestamp": "2026-05-08T14:32:00.000Z"
  }
]
```

**Package Registry:**
| Package | Feature Name |
|---------|-------------|
| `com.samsung.android.photostudio` | AI Photo Erase |
| `com.samsung.android.app.notes` | Note Assist |
| `com.samsung.android.wallpaper.res` | AI Wallpaper |
| `com.samsung.android.livestranslate` | Live Translate |
| `com.google.android.googlequicksearchbox` | Circle to Search |

**Thresholds:**
- Minimum engagement: 3 seconds in foreground
- Deduplication: same feature not re-triggered within 6 hours
- State stored in: `memory/last_triggered.json`

**Fallback:** If Termux API is unavailable, enters DEMO MODE and simulates a random feature detection with console log `DEMO MODE: simulating feature detection`.

**Permission required:** `android.permission.PACKAGE_USAGE_STATS`

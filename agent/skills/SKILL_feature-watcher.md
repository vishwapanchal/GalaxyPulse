# Feature Watcher Skill

Purpose: Query Android UsageStats API, return list of Galaxy AI features used in the last N minutes with usage duration.
Input: `{ "lookback_minutes": 10 }`
Output: `[ { "package": "com.samsung.android.photostudio", "feature_name": "AI Photo Erase", "duration_sec": 45, "timestamp": "..." } ]`
Permission required: `android.permission.PACKAGE_USAGE_STATS`

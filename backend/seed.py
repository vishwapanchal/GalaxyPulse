"""
Seed script — populates the database with realistic mock data
for all 6 Galaxy AI features so the dashboard has something to show.

Usage:
    .\\venv\\Scripts\\python seed.py
"""
import asyncio
import random
from datetime import datetime, timedelta
from app.db.database import AsyncSessionLocal, create_tables
from app.models.feedback import FeedbackRecord
from app.models.feature import FeatureHealth
from app.models.ota import OTAEvent
from app.models.digest import WeeklyDigest
import uuid

FEATURES = [
    {"id": "ai_photo_erase",   "name": "AI Photo Erase",    "pkg": "com.samsung.android.photostudio"},
    {"id": "circle_to_search", "name": "Circle to Search",  "pkg": "com.google.android.googlequicksearchbox"},
    {"id": "ai_wallpaper",     "name": "AI Wallpaper",      "pkg": "com.samsung.android.wallpaper.res"},
    {"id": "live_translate",   "name": "Live Translate",    "pkg": "com.samsung.android.livetranslate"},
    {"id": "generative_edit",  "name": "Generative Edit",   "pkg": "com.samsung.android.photostudio"},
    {"id": "note_assist",      "name": "Note Assist",       "pkg": "com.samsung.android.app.notes"},
]

TAGS_BY_FEATURE = {
    "ai_photo_erase":   ["shadow_artifact", "edge_quality", "multi_attempt", "brush_precision", "color_bleed"],
    "circle_to_search": ["slow_response", "wrong_result", "ui_lag", "good_accuracy", "ocr_error"],
    "ai_wallpaper":     ["generation_quality", "style_mismatch", "slow_generation", "color_palette", "prompt_ignored"],
    "live_translate":   ["translation_error", "language_detection", "latency", "audio_quality", "missed_words"],
    "generative_edit":  ["artifact_blur", "context_mismatch", "slow_processing", "good_result", "edge_fringing"],
    "note_assist":      ["summary_accuracy", "bullet_format", "missed_points", "good_summary", "language_error"],
}

TIME_OF_DAY = ["morning", "afternoon", "evening", "night"]
SENTIMENTS = ["positive", "neutral", "negative_friction", "negative_quality"]


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        # OTA Events
        ota_events = [
            OTAEvent(
                build_version="One UI 7.0 / April OTA",
                release_date=(datetime.utcnow() - timedelta(days=21)).date(),
                features_updated=["ai_photo_erase", "circle_to_search"],
                notes="April security patch + AI Photo Erase brush improvements",
            ),
            OTAEvent(
                build_version="One UI 7.0 / May OTA",
                release_date=(datetime.utcnow() - timedelta(days=7)).date(),
                features_updated=["ai_wallpaper", "generative_edit", "note_assist"],
                notes="May update — Generative Edit speed improvements",
            ),
        ]
        for e in ota_events:
            db.add(e)

        # Feedback records — 30 days of synthetic data
        feature_stats = {f["id"]: {"total": 0, "sat_sum": 0, "friction": 0} for f in FEATURES}

        for day_offset in range(30):
            ts_base = datetime.utcnow() - timedelta(days=30 - day_offset)
            for feature in FEATURES:
                # 2-6 sessions per feature per day
                for _ in range(random.randint(2, 6)):
                    sat = random.choices([1, 2, 3, 4, 5], weights=[5, 10, 20, 40, 25])[0]
                    has_friction = sat <= 3 and random.random() < 0.6
                    tags = random.sample(TAGS_BY_FEATURE[feature["id"]], k=random.randint(1, 3))
                    stress = random.gauss(45, 20)
                    build = "One UI 7.0 / May OTA" if day_offset >= 23 else "One UI 7.0 / April OTA"

                    record = FeedbackRecord(
                        session_id=str(uuid.uuid4()),
                        user_id=f"user_{random.randint(1, 20):03d}",
                        feature_id=feature["id"],
                        feature_name=feature["name"],
                        build_version=build,
                        timestamp=ts_base + timedelta(hours=random.randint(8, 22)),
                        satisfaction=sat,
                        friction=has_friction,
                        severity="high" if sat == 1 else ("medium" if sat == 2 else "low"),
                        sentiment=random.choice(SENTIMENTS),
                        verbatim_q1=f"Mock verbatim for {feature['name']} — session {day_offset}",
                        auto_tags=tags,
                        stress_score=max(0, min(100, stress)),
                        sleep_score=random.gauss(70, 15),
                        battery_level=random.randint(20, 100),
                        time_of_day=random.choice(TIME_OF_DAY),
                        location_type=random.choice(["home", "work", "transit"]),
                    )
                    db.add(record)

                    stats = feature_stats[feature["id"]]
                    stats["total"] += 1
                    stats["sat_sum"] += sat
                    if has_friction:
                        stats["friction"] += 1

        # Feature health summary
        for feature in FEATURES:
            stats = feature_stats[feature["id"]]
            avg_sat = stats["sat_sum"] / stats["total"] if stats["total"] else 3.0
            friction_rate = stats["friction"] / stats["total"] if stats["total"] else 0.0
            health_score = ((avg_sat - 1) / 4) * 100

            db.add(FeatureHealth(
                feature_id=feature["id"],
                feature_name=feature["name"],
                package_name=feature["pkg"],
                health_score=round(health_score, 1),
                avg_satisfaction_7d=round(avg_sat, 2),
                avg_satisfaction_30d=round(avg_sat, 2),
                friction_rate=round(friction_rate, 3),
                total_sessions=stats["total"],
            ))

        await db.commit()
        print(f"✅ Seeded {sum(s['total'] for s in feature_stats.values())} feedback records across {len(FEATURES)} features")


if __name__ == "__main__":
    asyncio.run(seed())

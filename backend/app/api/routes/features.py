from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from datetime import datetime, timedelta
from collections import Counter

from app.db.database import get_db
from app.models.feature import FeatureHealth
from app.models.feedback import FeedbackRecord
from app.schemas.feature import (
    FeatureHealthResponse, FeatureTimeline, SentimentPoint,
    FeatureTagsResponse, TagFrequency
)

router = APIRouter(prefix="/api/features", tags=["Features"])


@router.get("", response_model=list[FeatureHealthResponse])
async def list_features(db: AsyncSession = Depends(get_db)):
    """List all features with current health scores."""
    result = await db.execute(
        select(FeatureHealth).order_by(desc(FeatureHealth.health_score))
    )
    return result.scalars().all()


@router.get("/{feature_id}/timeline", response_model=FeatureTimeline)
async def feature_timeline(feature_id: str, db: AsyncSession = Depends(get_db)):
    """Sentiment timeline for a feature — daily avg satisfaction over last 30 days."""
    result = await db.execute(
        select(FeatureHealth).where(FeatureHealth.feature_id == feature_id)
    )
    feature = result.scalar_one_or_none()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")

    # Query daily aggregates
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    rows = await db.execute(
        select(
            func.date(FeedbackRecord.timestamp).label("date"),
            func.avg(FeedbackRecord.satisfaction).label("avg_satisfaction"),
            func.count(FeedbackRecord.id).label("count"),
            FeedbackRecord.build_version,
        )
        .where(
            and_(
                FeedbackRecord.feature_id == feature_id,
                FeedbackRecord.timestamp >= thirty_days_ago,
            )
        )
        .group_by(func.date(FeedbackRecord.timestamp), FeedbackRecord.build_version)
        .order_by(func.date(FeedbackRecord.timestamp))
    )

    timeline = [
        SentimentPoint(
            date=str(row.date),
            avg_satisfaction=round(row.avg_satisfaction or 0, 2),
            session_count=row.count,
            build_version=row.build_version,
        )
        for row in rows
    ]

    return FeatureTimeline(
        feature_id=feature_id,
        feature_name=feature.feature_name,
        timeline=timeline,
    )


@router.get("/{feature_id}/tags", response_model=FeatureTagsResponse)
async def feature_tags(feature_id: str, db: AsyncSession = Depends(get_db)):
    """Top friction tags for a feature."""
    rows = await db.execute(
        select(FeedbackRecord.auto_tags).where(
            FeedbackRecord.feature_id == feature_id
        )
    )
    all_tags = rows.scalars().all()

    counter: Counter = Counter()
    for tag_list in all_tags:
        if tag_list:
            counter.update(tag_list)

    tags = [TagFrequency(tag=t, count=c) for t, c in counter.most_common(20)]
    return FeatureTagsResponse(feature_id=feature_id, tags=tags)

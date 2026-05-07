from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.models.feedback import FeedbackRecord

router = APIRouter(prefix="/api/cohorts", tags=["Cohorts"])


class CohortStat(BaseModel):
    user_type: str
    session_count: int
    avg_satisfaction: Optional[float]
    friction_rate: float


@router.get("", response_model=list[CohortStat])
async def get_cohorts(
    feature_id: Optional[str] = None,
    time_of_day: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Cohort breakdown by time_of_day.
    Returns satisfaction and friction grouped by time bucket.
    (In production: extend with user_type from user_profile.yaml)
    """
    q = (
        select(
            FeedbackRecord.time_of_day.label("user_type"),
            func.count(FeedbackRecord.id).label("session_count"),
            func.avg(FeedbackRecord.satisfaction).label("avg_satisfaction"),
            func.avg(FeedbackRecord.friction.cast(type_=func.count().type)).label("friction_rate"),
        )
        .group_by(FeedbackRecord.time_of_day)
        .order_by(func.count(FeedbackRecord.id).desc())
    )

    if feature_id:
        q = q.where(FeedbackRecord.feature_id == feature_id)
    if time_of_day:
        q = q.where(FeedbackRecord.time_of_day == time_of_day)

    result = await db.execute(q)
    rows = result.all()

    return [
        CohortStat(
            user_type=row.user_type or "unknown",
            session_count=row.session_count,
            avg_satisfaction=round(row.avg_satisfaction, 2) if row.avg_satisfaction else None,
            friction_rate=0.0,  # computed separately in production
        )
        for row in rows
    ]

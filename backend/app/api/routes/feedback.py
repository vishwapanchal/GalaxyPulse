from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional

from app.db.database import get_db
from app.models.feedback import FeedbackRecord
from app.models.feature import FeatureHealth
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackListResponse

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(payload: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    """Store a feedback record from the OpenClaw agent."""
    # Check for duplicate session
    existing = await db.execute(
        select(FeedbackRecord).where(FeedbackRecord.session_id == payload.session_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Session already recorded")

    record = FeedbackRecord(**payload.model_dump())
    db.add(record)
    await db.flush()
    await db.refresh(record)

    # Update feature health score
    await _update_feature_health(db, payload)

    return record


@router.get("", response_model=FeedbackListResponse)
async def list_feedback(
    feature_id: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List feedback records with optional filters."""
    q = select(FeedbackRecord).order_by(desc(FeedbackRecord.timestamp))
    if feature_id:
        q = q.where(FeedbackRecord.feature_id == feature_id)
    if user_id:
        q = q.where(FeedbackRecord.user_id == user_id)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(q.limit(limit).offset(offset))
    items = result.scalars().all()

    return FeedbackListResponse(total=total, items=items)


async def _update_feature_health(db: AsyncSession, payload: FeedbackCreate):
    """Recalculate rolling health score for a feature after new feedback."""
    result = await db.execute(
        select(FeatureHealth).where(FeatureHealth.feature_id == payload.feature_id)
    )
    feature = result.scalar_one_or_none()

    if not feature:
        feature = FeatureHealth(
            feature_id=payload.feature_id,
            feature_name=payload.feature_name,
        )
        db.add(feature)

    feature.total_sessions = (feature.total_sessions or 0) + 1
    if payload.satisfaction:
        n = min(feature.total_sessions, 50)  # responsive rolling window
        prev_avg = feature.avg_satisfaction_7d or float(payload.satisfaction)
        new_avg = ((prev_avg * (n - 1)) + payload.satisfaction) / n
        feature.avg_satisfaction_7d  = round(new_avg, 3)
        feature.avg_satisfaction_30d = round(new_avg, 3)   # mirrors 7d until we track separate windows
        feature.health_score = round(((new_avg - 1) / 4) * 100, 1)
    if payload.friction:
        n = min(feature.total_sessions, 50)
        prev_rate = feature.friction_rate or 0.0
        feature.friction_rate = round(((prev_rate * (n - 1)) + 1) / n, 4)

from pydantic import BaseModel

class TriggerRequest(BaseModel):
    chat_id: int
    feature: str
    health_context: dict
    decision: Optional[str] = None
    explanation: Optional[str] = None

@router.post("/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_feedback(payload: TriggerRequest):
    """Trigger a real Telegram conversation from the Android agent."""
    from app.services.telegram_bot import trigger_conversation
    success = await trigger_conversation(
        payload.chat_id, 
        payload.feature, 
        payload.health_context,
        payload.decision,
        payload.explanation
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start Telegram conversation")
    return {"status": "started"}

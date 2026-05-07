from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.ota import OTAEvent
from app.models.feedback import FeedbackRecord
from app.models.feature import FeatureHealth
from app.schemas.ota import OTAEventCreate, OTAEventResponse, OTACorrelationResponse, OTACorrelationEntry

router = APIRouter(prefix="/api/ota", tags=["OTA"])


@router.post("/event", response_model=OTAEventResponse, status_code=status.HTTP_201_CREATED)
async def register_ota_event(payload: OTAEventCreate, db: AsyncSession = Depends(get_db)):
    """Register a new OTA update event."""
    existing = await db.execute(
        select(OTAEvent).where(OTAEvent.build_version == payload.build_version)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Build version already registered")

    event = OTAEvent(**payload.model_dump())
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


@router.get("/event", response_model=list[OTAEventResponse])
async def list_ota_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OTAEvent).order_by(OTAEvent.release_date.desc()))
    return result.scalars().all()


@router.get("/correlation", response_model=OTACorrelationResponse)
async def ota_correlation(db: AsyncSession = Depends(get_db)):
    """Compute before/after sentiment delta for each OTA event × affected feature."""
    events_result = await db.execute(
        select(OTAEvent).order_by(OTAEvent.release_date.desc()).limit(10)
    )
    events = events_result.scalars().all()

    correlations = []
    window = timedelta(days=7)

    for event in events:
        release_dt = datetime.combine(event.release_date, datetime.min.time())
        for feature_id in (event.features_updated or []):
            # Avg satisfaction 7 days BEFORE release
            before = await db.execute(
                select(func.avg(FeedbackRecord.satisfaction)).where(
                    and_(
                        FeedbackRecord.feature_id == feature_id,
                        FeedbackRecord.timestamp >= release_dt - window,
                        FeedbackRecord.timestamp < release_dt,
                    )
                )
            )
            # Avg satisfaction 7 days AFTER release
            after = await db.execute(
                select(func.avg(FeedbackRecord.satisfaction)).where(
                    and_(
                        FeedbackRecord.feature_id == feature_id,
                        FeedbackRecord.timestamp >= release_dt,
                        FeedbackRecord.timestamp < release_dt + window,
                    )
                )
            )

            # Get feature name
            feat = await db.execute(
                select(FeatureHealth).where(FeatureHealth.feature_id == feature_id)
            )
            feature = feat.scalar_one_or_none()
            feature_name = feature.feature_name if feature else feature_id

            avg_before = before.scalar_one_or_none()
            avg_after = after.scalar_one_or_none()
            delta = None
            is_regression = False
            if avg_before is not None and avg_after is not None:
                # Scale 1-5 to 0-100 for delta comparison
                delta = (avg_after - avg_before) * 20
                is_regression = delta < -10

            correlations.append(OTACorrelationEntry(
                feature_id=feature_id,
                feature_name=feature_name,
                build_version=event.build_version,
                release_date=event.release_date,
                avg_satisfaction_before=round(avg_before, 2) if avg_before else None,
                avg_satisfaction_after=round(avg_after, 2) if avg_after else None,
                delta=round(delta, 2) if delta is not None else None,
                is_regression=is_regression,
            ))

    return OTACorrelationResponse(correlations=correlations)

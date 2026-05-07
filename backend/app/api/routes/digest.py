from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.database import get_db
from app.models.digest import WeeklyDigest
from app.schemas.digest import DigestCreate, DigestResponse

router = APIRouter(prefix="/api/digest", tags=["Digest"])


@router.get("/weekly", response_model=DigestResponse)
async def get_latest_digest(db: AsyncSession = Depends(get_db)):
    """Get the most recent weekly digest."""
    result = await db.execute(
        select(WeeklyDigest).order_by(desc(WeeklyDigest.week_start)).limit(1)
    )
    digest = result.scalar_one_or_none()
    if not digest:
        raise HTTPException(status_code=404, detail="No digest found yet")
    return digest


@router.get("/weekly/all", response_model=list[DigestResponse])
async def list_digests(db: AsyncSession = Depends(get_db)):
    """List all weekly digests (newest first)."""
    result = await db.execute(
        select(WeeklyDigest).order_by(desc(WeeklyDigest.week_start))
    )
    return result.scalars().all()


@router.post("/weekly", response_model=DigestResponse, status_code=status.HTTP_201_CREATED)
async def post_digest(payload: DigestCreate, db: AsyncSession = Depends(get_db)):
    """Post a new weekly digest from the OpenClaw HEARTBEAT agent."""
    # Upsert: overwrite existing digest for same week_start
    result = await db.execute(
        select(WeeklyDigest).where(WeeklyDigest.week_start == payload.week_start)
    )
    existing = result.scalar_one_or_none()

    if existing:
        for field, value in payload.model_dump().items():
            setattr(existing, field, value)
        digest = existing
    else:
        digest = WeeklyDigest(**payload.model_dump())
        db.add(digest)

    await db.flush()
    await db.refresh(digest)
    return digest

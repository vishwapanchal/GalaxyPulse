from sqlalchemy import Column, Date, JSON, DateTime, func
from sqlalchemy import Uuid as UUID
import uuid
from app.db.database import Base


class WeeklyDigest(Base):
    __tablename__ = "weekly_digests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    week_start = Column(Date, unique=True, index=True, nullable=False)
    top_issues = Column(JSON, default=list)
    sentiment_changes = Column(JSON, default=dict)
    novelty_flags = Column(JSON, default=list)
    ota_correlations = Column(JSON, default=list)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

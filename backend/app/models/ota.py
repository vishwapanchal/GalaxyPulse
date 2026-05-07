from sqlalchemy import Column, String, Date, JSON, DateTime, func
from sqlalchemy import Uuid as UUID
import uuid
from app.db.database import Base


class OTAEvent(Base):
    __tablename__ = "ota_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    build_version = Column(String(64), unique=True, index=True, nullable=False)
    release_date = Column(Date, nullable=False)
    features_updated = Column(JSON, default=list)          # list of feature_ids updated in this OTA
    notes = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

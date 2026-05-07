from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text, func
from sqlalchemy import Uuid as UUID
import uuid
from app.db.database import Base


class FeedbackRecord(Base):
    __tablename__ = "feedback_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(String(64), index=True, nullable=False)
    feature_id = Column(String(64), index=True, nullable=False)
    feature_name = Column(String(128), nullable=False)
    build_version = Column(String(64), nullable=True)

    # Feedback scores
    satisfaction = Column(Integer, nullable=True)          # 1–5
    friction = Column(Boolean, default=False)
    severity = Column(String(32), nullable=True)           # low / medium / high
    sentiment = Column(String(64), nullable=True)          # e.g. negative_friction

    # Verbatim responses
    verbatim_q1 = Column(Text, nullable=True)
    verbatim_q2 = Column(Text, nullable=True)

    # Auto-generated tags (stored as JSON array)
    auto_tags = Column(JSON, default=list)

    # Biometric context at time of feedback
    stress_score = Column(Float, nullable=True)
    sleep_score = Column(Float, nullable=True)
    heart_rate = Column(Float, nullable=True)
    steps_today = Column(Integer, nullable=True)
    battery_level = Column(Integer, nullable=True)
    time_of_day = Column(String(32), nullable=True)        # morning / afternoon / evening / night
    location_type = Column(String(32), nullable=True)      # home / work / transit / other

    # Timestamps
    timestamp = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

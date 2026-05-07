from sqlalchemy import Column, String, Float, Integer, DateTime, func
from app.db.database import Base


class FeatureHealth(Base):
    __tablename__ = "feature_health"

    feature_id = Column(String(64), primary_key=True)
    feature_name = Column(String(128), nullable=False)
    package_name = Column(String(256), nullable=True)

    health_score = Column(Float, default=100.0)            # 0–100
    avg_satisfaction_7d = Column(Float, nullable=True)     # 1–5 rolling avg
    avg_satisfaction_30d = Column(Float, nullable=True)
    friction_rate = Column(Float, default=0.0)             # 0–1 fraction
    total_sessions = Column(Integer, default=0)

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

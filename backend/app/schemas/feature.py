from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FeatureHealthResponse(BaseModel):
    feature_id: str
    feature_name: str
    package_name: Optional[str]
    health_score: float
    avg_satisfaction_7d: Optional[float]
    avg_satisfaction_30d: Optional[float]
    friction_rate: float
    total_sessions: int
    last_updated: datetime

    model_config = {"from_attributes": True}


class SentimentPoint(BaseModel):
    """One point on the sentiment timeline chart."""
    date: str               # ISO date string
    avg_satisfaction: float
    session_count: int
    build_version: Optional[str]


class FeatureTimeline(BaseModel):
    feature_id: str
    feature_name: str
    timeline: list[SentimentPoint]


class TagFrequency(BaseModel):
    tag: str
    count: int


class FeatureTagsResponse(BaseModel):
    feature_id: str
    tags: list[TagFrequency]

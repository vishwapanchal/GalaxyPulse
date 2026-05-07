from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import uuid


class OTAEventCreate(BaseModel):
    build_version: str
    release_date: date
    features_updated: List[str] = []
    notes: Optional[str] = None


class OTAEventResponse(BaseModel):
    id: uuid.UUID
    build_version: str
    release_date: date
    features_updated: List[str]
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class OTACorrelationEntry(BaseModel):
    feature_id: str
    feature_name: str
    build_version: str
    release_date: date
    avg_satisfaction_before: Optional[float]
    avg_satisfaction_after: Optional[float]
    delta: Optional[float]
    is_regression: bool         # True if delta < -10 points


class OTACorrelationResponse(BaseModel):
    correlations: List[OTACorrelationEntry]

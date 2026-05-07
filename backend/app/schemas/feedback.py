from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


# ── Incoming from OpenClaw agent ───────────────────────────────────────────────
class FeedbackCreate(BaseModel):
    session_id: str = Field(..., description="Unique session ID from agent")
    user_id: str = Field(..., description="Anonymised user identifier")
    feature_id: str = Field(..., description="Slug e.g. ai_photo_erase")
    feature_name: str = Field(..., description="Human-readable feature name")
    build_version: Optional[str] = None
    timestamp: datetime

    # Scores
    satisfaction: Optional[int] = Field(None, ge=1, le=5)
    friction: bool = False
    severity: Optional[str] = None
    sentiment: Optional[str] = None

    # Verbatim
    verbatim_q1: Optional[str] = None
    verbatim_q2: Optional[str] = None
    auto_tags: List[str] = []

    # Biometric context
    stress_score: Optional[float] = Field(None, ge=0, le=100)
    sleep_score: Optional[float] = Field(None, ge=0, le=100)
    heart_rate: Optional[float] = None
    steps_today: Optional[int] = None
    battery_level: Optional[int] = Field(None, ge=0, le=100)
    time_of_day: Optional[str] = None
    location_type: Optional[str] = None


# ── Response ────────────────────────────────────────────────────────────────────
class FeedbackResponse(BaseModel):
    id: uuid.UUID
    session_id: str
    feature_id: str
    feature_name: str
    satisfaction: Optional[int]
    friction: bool
    sentiment: Optional[str]
    auto_tags: List[str]
    timestamp: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackListResponse(BaseModel):
    total: int
    items: List[FeedbackResponse]

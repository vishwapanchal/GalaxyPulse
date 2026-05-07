from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
import uuid


class DigestCreate(BaseModel):
    week_start: date
    top_issues: List[dict] = []
    sentiment_changes: dict = {}
    novelty_flags: List[str] = []
    ota_correlations: List[dict] = []


class DigestResponse(BaseModel):
    id: uuid.UUID
    week_start: date
    top_issues: List[dict]
    sentiment_changes: dict
    novelty_flags: List[str]
    ota_correlations: List[dict]
    generated_at: datetime

    model_config = {"from_attributes": True}

from datetime import datetime
from pydantic import BaseModel, ConfigDict

class IncidentCreate(BaseModel):
    title: str
    service: str
    severity: str  # critical, high, medium, low
    status: str = "open"  # open, investigating, resolved
    root_cause: str | None = None
    confidence_score: float | None = None
    recovery_action: str | None = None

class IncidentOut(BaseModel):
    id: int
    title: str
    service: str
    status: str
    severity: str
    root_cause: str | None
    confidence_score: float | None
    recovery_action: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

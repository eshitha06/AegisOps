from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RecoveryActionCreate(BaseModel):
    incident_id: int
    action_type: str
    description: str
    status: str = "pending"  # pending, approved, executed, failed

class RecoveryActionOut(BaseModel):
    id: int
    incident_id: int
    action_type: str
    description: str
    status: str
    executed_at: datetime | None
    execution_log: str | None
    verification_result: str | None
    incident_title: str | None = None
    incident_service: str | None = None
    incident_status: str | None = None
    observed_evidence: str | None = None
    rca_result: str | None = None

    model_config = ConfigDict(from_attributes=True)

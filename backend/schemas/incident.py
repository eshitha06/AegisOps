from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IncidentCreate(BaseModel):
    title: str
    service: str
    severity: str  # critical, high, medium, low
    status: str = "open"  # open, investigating, verifying, recovery_pending, recovering, verification, recovery_failed, resolved
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
    observed_evidence: str | None
    rca_result: str | None
    resolution: str | None
    created_at: datetime
    resolved_at: datetime | None

    # Synchronized live telemetry fields
    live_condition: str | None = "CLEARED"  # "ACTIVE" or "CLEARED"
    current_service_state: str | None = "HEALTHY"  # "HEALTHY", "DEGRADED", "DOWN"
    current_cpu_percent: float | None = 0.0
    current_memory_percent: float | None = 0.0
    current_error_rate: float | None = 0.0
    current_latency_ms: float | None = 0.0
    incident_cpu_percent: float | None = None
    incident_memory_percent: float | None = None
    incident_error_rate: float | None = None
    incident_latency_ms: float | None = None
    last_telemetry_time: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

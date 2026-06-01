from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class MetricIn(BaseModel):
    service: str
    cpu_usage: float = Field(..., ge=0.0, le=1.0, description="CPU usage (0.0 to 1.0)")
    memory_usage: float = Field(..., ge=0.0, le=1.0, description="Memory usage (0.0 to 1.0)")
    error_rate: float = Field(..., ge=0.0, description="Errors per second")
    latency_ms: float = Field(..., ge=0.0, description="Response time in milliseconds")
    request_count: int = Field(..., ge=0, description="Requests per minute")

class MetricOut(BaseModel):
    id: int
    service: str
    cpu_usage: float
    memory_usage: float
    error_rate: float
    latency_ms: float
    request_count: int
    is_anomaly: bool
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

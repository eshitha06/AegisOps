from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from backend.db import Base

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    service = Column(String, index=True, nullable=False)
    cpu_usage = Column(Float, nullable=False)
    memory_usage = Column(Float, nullable=False)
    error_rate = Column(Float, nullable=False)
    latency_ms = Column(Float, nullable=False)
    request_count = Column(Integer, nullable=False)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

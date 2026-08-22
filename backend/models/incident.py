from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from backend.db import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    service = Column(String, index=True, nullable=False)
    source = Column(String, index=True, nullable=False, default="demo")
    status = Column(String, default="open", nullable=False)  # open, investigating, resolved
    severity = Column(String, nullable=False)  # critical, high, medium, low
    root_cause = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    recovery_action = Column(String, nullable=True)
    observed_evidence = Column(String, nullable=True)
    rca_result = Column(String, nullable=True)
    resolution = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

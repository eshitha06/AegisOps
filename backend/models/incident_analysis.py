import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
# Adjust this import based on where your base is declared (e.g., database.config, db.session)
from backend.db import Base

class IncidentAnalysis(Base):
    __tablename__ = "incident_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    service = Column(String, index=True, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    anomaly_score = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    root_cause = Column(String, nullable=False)
    recommended_action = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
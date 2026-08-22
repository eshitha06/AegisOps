from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.db import Base

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, approved, executed, failed
    executed_at = Column(DateTime, nullable=True)
    execution_log = Column(String, nullable=True)
    verification_result = Column(String, nullable=True)

    incident = relationship("Incident")

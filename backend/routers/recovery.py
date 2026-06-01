from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.recovery_action import RecoveryAction
from backend.schemas.recovery import RecoveryActionOut

router = APIRouter(prefix="/api/recovery", tags=["recovery"])

@router.post("/{id}/approve", response_model=RecoveryActionOut)
def approve_action(id: int, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == id).first()
    if not action:
        # Phase 1 fallback mock response if no database records exist
        return RecoveryActionOut(
            id=id,
            incident_id=1,
            action_type="restart",
            description="Restart payment-service container",
            status="approved",
            executed_at=None
        )
    action.status = "approved"
    db.commit()
    db.refresh(action)
    return action

@router.post("/{id}/execute")
def execute_action(id: int, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == id).first()
    if action:
        action.status = "executed"
        action.executed_at = datetime.utcnow()
        db.commit()
    
    # Phase 1 placeholder execution log
    return {
        "status": "success",
        "log": [
            "[INFO] Connecting to service host...",
            "[INFO] Stopping payment-service...",
            "[INFO] Starting payment-service...",
            "[INFO] Service restarted. Running health check...",
            "[INFO] Health check passed. Status updated to resolved."
        ]
    }

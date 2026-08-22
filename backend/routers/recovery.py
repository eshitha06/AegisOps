import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.recovery_action import RecoveryAction
from backend.models.incident import Incident
from backend.schemas.recovery import RecoveryActionOut
from backend.services.recovery_service import execute_and_verify

router = APIRouter(prefix="/api/recovery", tags=["recovery"])

@router.get("", response_model=list[RecoveryActionOut])
def list_recovery_actions(incident_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(RecoveryAction).join(Incident, RecoveryAction.incident_id == Incident.id)
    query = query.filter(Incident.source == "real")
    if incident_id:
        query = query.filter(RecoveryAction.incident_id == incident_id)
    else:
        # Recommendations are operational work, not an archive of completed
        # actions. Resolved incidents remain available on their incident page.
        query = query.filter(Incident.status != "resolved")
    # This is a live work queue. Do not serialize every incident's complete
    # RCA/evidence document here: those documents may contain historical
    # evidence and can grow large enough to block the recommendations route.
    actions = query.order_by(RecoveryAction.id.asc()).limit(100).all()
    return [{
        "id": action.id, "incident_id": action.incident_id,
        "action_type": action.action_type, "description": action.description,
        "status": action.status, "executed_at": action.executed_at,
        "execution_log": action.execution_log, "verification_result": action.verification_result,
        "incident_title": action.incident.title, "incident_service": action.incident.service,
        "incident_status": action.incident.status,
        # Full evidence remains authoritative on GET /api/incidents/{id}; the
        # action list is deliberately a compact, real-time operational view.
        "observed_evidence": None,
        "rca_result": None,
    } for action in actions]

@router.post("/{id}/approve", response_model=RecoveryActionOut)
def approve_action(id: int, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Recovery action with ID {id} not found")
        
    action.status = "approved"
    action.incident.status = "recovery_pending"
    db.commit()
    db.refresh(action)
    return action

@router.post("/{id}/execute")
async def execute_action(id: int, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Recovery action with ID {id} not found")
        
    if action.status != "approved":
        raise HTTPException(status_code=409, detail="Human approval is required before execution")
    try:
        result = await execute_and_verify(action, db)
        return {"status": "verified" if result["healthy"] else "verification_failed", "log": [json.dumps(result)]}
    except Exception as e:
        action.status = "failed"
        action.incident.status = "recovery_failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Recovery execution failed: {str(e)}")

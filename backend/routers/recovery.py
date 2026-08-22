import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.recovery_action import RecoveryAction
from backend.schemas.recovery import RecoveryActionOut
from backend.services.recovery_service import execute_and_verify

router = APIRouter(prefix="/api/recovery", tags=["recovery"])

@router.get("", response_model=list[RecoveryActionOut])
def list_recovery_actions(incident_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(RecoveryAction)
    if incident_id:
        query = query.filter(RecoveryAction.incident_id == incident_id)
    return query.order_by(RecoveryAction.id.asc()).all()

@router.post("/{id}/approve", response_model=RecoveryActionOut)
def approve_action(id: int, db: Session = Depends(get_db)):
    action = db.query(RecoveryAction).filter(RecoveryAction.id == id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Recovery action with ID {id} not found")
        
    action.status = "approved"
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
        raise HTTPException(status_code=500, detail=f"Execution simulation failed: {str(e)}")

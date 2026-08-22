import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.incident import Incident
from agents import rca_agent, recovery_agent

router = APIRouter(prefix="/api/agents", tags=["agents"])

class RunAgentRequest(BaseModel):
    incident_id: int

@router.post("/run-rca")
async def run_rca(payload: RunAgentRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident with ID {payload.incident_id} not found")
    
    try:
        result = await rca_agent.run(payload.incident_id, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run RCA agent: {str(e)}")

@router.post("/run-recovery")
async def run_recovery(payload: RunAgentRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident with ID {payload.incident_id} not found")
        
    try:
        # Load existing RCA details or run it dynamically if missing
        if not incident.root_cause:
            rca_result = await rca_agent.run(payload.incident_id, db)
        else:
            try:
                rec_data = json.loads(incident.rca_result or "{}")
                recs = rec_data.get("recommendations", [])
            except Exception:
                recs = []
                
            rca_result = {
                "ai_inference": incident.root_cause,
                "confidence": incident.confidence_score or 0.85,
                "recommendations": recs
            }
            
        result = recovery_agent.run(rca_result, payload.incident_id, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run Recovery agent: {str(e)}")

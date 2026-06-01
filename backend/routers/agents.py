from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/agents", tags=["agents"])

class RunAgentRequest(BaseModel):
    incident_id: int

@router.post("/run-rca")
def run_rca(payload: RunAgentRequest):
    # Phase 1 placeholder response matching RCAResult data contract
    return {
        "root_cause": "Placeholder: Database connection leak in payment-service",
        "confidence": 0.95,
        "timeline": [
            "12:00:00 - API Gateway latency spikes",
            "12:00:05 - Connection pool exhaustion in payment-service",
            "12:00:10 - Database begins rejecting connections"
        ],
        "similar_past_incidents": []
    }

@router.post("/run-recovery")
def run_recovery(payload: RunAgentRequest):
    # Phase 1 placeholder response matching RecoveryPlan data contract
    return {
        "actions": [
            {"priority": 1, "type": "restart", "description": "Restart payment-service container"},
            {"priority": 2, "type": "scale", "description": "Increase connection pool size to 50"},
            {"priority": 3, "type": "rollback", "description": "Rollback to version v2.2"}
        ],
        "estimated_recovery_minutes": 5,
        "confidence": 0.9
    }

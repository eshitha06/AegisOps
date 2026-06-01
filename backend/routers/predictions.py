from fastapi import APIRouter

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

@router.get("/{service}")
def get_prediction(service: str):
    # Phase 1 placeholder response matching expected failure prediction response
    return {
        "service": service,
        "risk_score": 0.12,
        "estimated_time_to_failure_minutes": None,
        "status": "healthy",
        "trend_direction": "stable"
    }

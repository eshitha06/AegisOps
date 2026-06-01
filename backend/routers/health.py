from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def get_health():
    return {"status": "healthy", "version": "1.0.0"}

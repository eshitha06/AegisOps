from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.services.prediction_service import prediction_service

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

@router.get("/{service}")
def get_prediction(service: str, db: Session = Depends(get_db)):
    return prediction_service.predict_status(service, db)

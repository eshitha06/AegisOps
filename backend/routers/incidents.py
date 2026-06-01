from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.incident import Incident
from backend.schemas.incident import IncidentCreate, IncidentOut

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status: str | None = Query(None, description="Filter incidents by status (open, investigating, resolved)"),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    return query.order_by(Incident.created_at.desc()).all()

@router.get("/{id}", response_model=IncidentOut)
def get_incident(id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.post("", response_model=IncidentOut)
def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    db_incident = Incident(
        title=incident_in.title,
        service=incident_in.service,
        severity=incident_in.severity,
        status=incident_in.status,
        root_cause=incident_in.root_cause,
        confidence_score=incident_in.confidence_score,
        recovery_action=incident_in.recovery_action
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident

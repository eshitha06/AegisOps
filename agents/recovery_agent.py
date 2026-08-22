"""Create only explicitly allowlisted demo-env recovery recommendations."""
from backend.models.incident import Incident
from backend.models.recovery_action import RecoveryAction

def run(rca_result, incident_id, db):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {"actions": [], "confidence": 0.0}
    action_type = "restart_worker" if incident.service == "worker" else "restart_database"
    description = "Restart the demo worker" if action_type == "restart_worker" else "Restart the demo PostgreSQL database"
    db.query(RecoveryAction).filter(RecoveryAction.incident_id == incident_id).delete()
    action = RecoveryAction(incident_id=incident_id, action_type=action_type, description=description, status="pending")
    db.add(action); db.commit(); db.refresh(action)
    return {"actions": [{"id": action.id, "priority": 1, "type": action_type,
                           "description": description, "status": action.status}],
            "estimated_recovery_minutes": None, "confidence": 0.0,
            "note": "Recommendation is a fixed demo-env allowlist action; no reliability claim is made."}

"""Create only explicitly allowlisted demo-env recovery recommendations."""
from backend.models.incident import Incident
from backend.models.recovery_action import RecoveryAction

def run(rca_result, incident_id, db):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {"actions": [], "confidence": 0.0}
    # The recommendation is selected only from the demo-env allowlist.  Gemini
    # may explain the evidence, but it never supplies a shell command.
    title = incident.title.lower()
    if "cpu" in title:
        action_type, description = "stop_cpu_stress", "Stop the active demo CPU stress"
    elif "memory" in title:
        action_type, description = "release_memory", "Release the active demo memory stress"
    elif "latency" in title:
        action_type, description = "remove_latency", "Remove the active demo latency injection"
    elif "error rate" in title or "http" in title:
        action_type, description = "remove_http_errors", "Remove the active demo HTTP error injection"
    elif incident.service == "worker":
        action_type, description = "restart_worker", "Restart the demo worker"
    else:
        action_type, description = "restart_database", "Restart the demo PostgreSQL database"
    db.query(RecoveryAction).filter(RecoveryAction.incident_id == incident_id).delete()
    action = RecoveryAction(incident_id=incident_id, action_type=action_type, description=description, status="pending")
    db.add(action); db.commit(); db.refresh(action)
    return {"actions": [{"id": action.id, "priority": 1, "type": action_type,
                           "description": description, "status": action.status}],
            "estimated_recovery_minutes": None, "confidence": 0.0,
            "note": "Recommendation is a fixed demo-env allowlist action; no reliability claim is made."}

"""Evidence-based RCA.  No synthetic logs, deployments, or root causes."""
import json
from backend.models.incident import Incident
from backend.services.evidence_service import collect_incident_evidence
from backend.services.rag_service import rag_service


async def run(incident_id: int, db):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {"observed_evidence": {}, "inference": "Incident not found.", "confidence": 0.0, "recommendations": []}
    evidence = await collect_incident_evidence(incident, db)
    similar = rag_service.search_similar(incident, db)
    evidence["similar_resolved_incidents"] = similar
    current = evidence.get("current_metric") or {}
    health = evidence.get("service_health", {})
    signals = []
    if current.get("cpu", 0) >= .9: signals.append("CPU utilization is at or above 90%")
    if current.get("latency_ms", 0) >= 1500: signals.append("p95 latency is at or above 1500 ms")
    if current.get("errors_per_second", 0) >= .05: signals.append("error rate is elevated")
    if health.get("api", {}).get("status_code", 200) >= 500: signals.append("API readiness check is failing")
    if health.get("worker", {}).get("status_code", 200) >= 500: signals.append("worker readiness check is failing")
    inference = ("Observed signals: " + "; ".join(signals)) if signals else "Insufficient observed evidence to identify a root cause."
    recommendations = ["Restart the demo database after human approval"] if any("readiness" in s for s in signals) else ["Continue observation; no safe recovery action is justified by current evidence."]
    result = {"observed_evidence": evidence, "ai_inference": inference,
              "confidence": 0.7 if signals else 0.2, "recommendations": recommendations}
    incident.observed_evidence = json.dumps(evidence)
    incident.rca_result = json.dumps(result)
    incident.root_cause = inference
    incident.confidence_score = result["confidence"]
    db.commit(); db.refresh(incident)
    return result

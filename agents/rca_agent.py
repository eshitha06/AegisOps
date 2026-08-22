import asyncio
import json
from backend.models.incident import Incident
from backend.services.evidence_service import collect_incident_evidence
from backend.services.rag_service import rag_service
from backend.services.llm_service import analyze_evidence

async def run(incident_id: int, db):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        return {"error": "Incident not found"}
    evidence = await collect_incident_evidence(incident, db)
    evidence["similar_resolved_incidents"] = rag_service.search_similar(incident, db)
    gemini = await asyncio.to_thread(analyze_evidence, evidence)
    conclusion = gemini.get("conclusion") or {}
    result = {"observed_evidence": evidence, "gemini": gemini, "ai_conclusion": conclusion,
              "investigation_timeline": [
                  {"at": incident.created_at.isoformat() + "Z", "event": "Incident created from REAL telemetry"},
                  {"at": evidence["collected_at"], "event": "Observed evidence collected; historical incidents searched"},
                  {"at": gemini["started_at"], "event": "Gemini RCA started"},
                  {"at": gemini["completed_at"], "event": f"Gemini RCA {gemini['status']}"},
              ]}
    incident.observed_evidence = json.dumps(evidence)
    incident.rca_result = json.dumps(result)
    incident.root_cause = conclusion.get("root_cause")
    incident.confidence_score = conclusion.get("confidence")
    db.commit(); db.refresh(incident)
    return result

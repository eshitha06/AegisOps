"""Persistent incident knowledge backed by resolved PostgreSQL incidents."""
import json
from backend.models.incident import Incident


class RAGService:
    def search_similar(self, incident: Incident, db, k: int = 3) -> list[dict]:
        rows = (db.query(Incident).filter(Incident.status == "resolved", Incident.source == "real", Incident.id != incident.id)
                .order_by(Incident.created_at.desc()).limit(50).all())
        ranked = sorted(rows, key=lambda row: (row.service != incident.service, row.severity != incident.severity))[:k]
        def compact_snapshot(row: Incident) -> dict | None:
            """Keep historical matching evidence useful without embedding an
            entire prior RCA/evidence document inside a new Gemini request."""
            if not row.observed_evidence:
                return None
            try:
                payload = json.loads(row.observed_evidence)
                return {
                    "incident_metric": payload.get("incident_metric"),
                    "failure_injector_state": payload.get("failure_injector_state"),
                    "service_health": payload.get("service_health", {}).get(row.service),
                }
            except (TypeError, json.JSONDecodeError):
                return None

        return [{"id": row.id, "service": row.service, "symptoms": row.title,
                 "observed_evidence": compact_snapshot(row),
                 "root_cause": row.root_cause, "resolution": row.resolution,
                 "recovery_action": row.recovery_action,
                 "timestamp": (row.resolved_at or row.created_at).isoformat()} for row in ranked]


rag_service = RAGService()

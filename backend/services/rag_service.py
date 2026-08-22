"""Persistent incident knowledge backed by resolved PostgreSQL incidents."""
import json
from backend.models.incident import Incident


class RAGService:
    def search_similar(self, incident: Incident, db, k: int = 3) -> list[dict]:
        rows = (db.query(Incident).filter(Incident.status == "resolved", Incident.id != incident.id)
                .order_by(Incident.created_at.desc()).limit(50).all())
        ranked = sorted(rows, key=lambda row: (row.service != incident.service, row.severity != incident.severity))[:k]
        return [{"id": row.id, "service": row.service, "symptoms": row.title,
                 "observed_evidence": json.loads(row.observed_evidence) if row.observed_evidence else None,
                 "root_cause": row.root_cause, "resolution": row.resolution,
                 "recovery_action": row.recovery_action,
                 "timestamp": (row.resolved_at or row.created_at).isoformat()} for row in ranked]


rag_service = RAGService()

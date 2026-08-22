"""Safe recovery executor: fixed actions against demo-env only."""
import asyncio
import json
from datetime import datetime
import httpx
from backend.config import settings
from backend.services.evidence_service import collect_incident_evidence

ALLOWED_ACTIONS = {"restart_database", "restart_worker"}

async def execute_and_verify(action, db):
    if action.action_type not in ALLOWED_ACTIONS:
        raise ValueError("Action is not in the demo recovery allowlist")
    before = await collect_incident_evidence(action.incident, db)
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(f"{settings.FAILURE_INJECTOR_URL}/recover")
        response.raise_for_status()
        execution = response.json()
    await asyncio.sleep(5)
    after = await collect_incident_evidence(action.incident, db)
    healthy = (after["service_health"]["api"].get("status_code") == 200 and
               after["service_health"]["worker"].get("status_code") == 200)
    result = {"before": before, "execution": execution, "after": after, "healthy": healthy}
    action.execution_log = json.dumps(execution)
    action.verification_result = json.dumps(result)
    action.executed_at = datetime.utcnow()
    action.status = "executed" if healthy else "failed"
    if healthy:
        action.incident.status = "resolved"
        action.incident.resolved_at = datetime.utcnow()
        action.incident.resolution = json.dumps(result)
    db.commit(); db.refresh(action)
    return result

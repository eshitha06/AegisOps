"""Safe recovery executor: fixed actions against demo-env only."""
import asyncio
import json
from datetime import datetime
import httpx
from backend.config import settings
from backend.services.evidence_service import collect_incident_evidence

ALLOWED_ACTIONS = {
    "stop_cpu_stress", "release_memory", "remove_latency", "remove_http_errors",
    "restart_database", "restart_worker",
}

ACTION_FAILURE_KIND = {
    "stop_cpu_stress": "cpu",
    "release_memory": "memory",
    "remove_latency": "latency",
    "remove_http_errors": "errors",
    "restart_database": "database",
    "restart_worker": "worker",
}


def _anomaly_cleared(metric: dict, service: str, action_type: str) -> bool:
    """Verify only the signal that caused this incident.

    A concurrent latency fault must not prevent a verified CPU recovery from
    resolving its own incident, and neither incident can resolve the other.
    """
    if metric.get("service") != service:
        return False
    if action_type == "stop_cpu_stress":
        return metric.get("cpu_usage", 1.0) <= 0.90
    if action_type == "release_memory":
        return metric.get("memory_usage", 1.0) <= 0.90
    if action_type == "remove_latency":
        return metric.get("latency_ms", float("inf")) <= 1500.0
    if action_type == "remove_http_errors":
        return metric.get("error_rate", 1.0) <= 0.05
    # Service restarts are verified through health/targets as well as the
    # request-level error and latency evidence they are intended to correct.
    return metric.get("error_rate", 1.0) <= 0.05 and metric.get("latency_ms", float("inf")) <= 1500.0

async def execute_and_verify(action, db):
    if action.action_type not in ALLOWED_ACTIONS:
        raise ValueError("Action is not in the demo recovery allowlist")
    action.status = "executing"
    action.incident.status = "recovering"
    db.commit()
    before = await collect_incident_evidence(action.incident, db)
    failure_kind = ACTION_FAILURE_KIND[action.action_type]
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(f"{settings.FAILURE_INJECTOR_URL}/recover/{failure_kind}")
        response.raise_for_status()
        execution = response.json()

    # Prometheus scrapes every five seconds.  Keep checking the actual demo
    # health, target health, injector state, and fresh Prometheus values until
    # the alert condition clears or the bounded verification window expires.
    from backend.services.prometheus_collector import prometheus_collector
    from backend.services.telemetry_collector import telemetry_collector
    action.incident.status = "verification"
    db.commit()
    deadline = asyncio.get_running_loop().time() + 50
    after = None
    fresh_metrics = []
    healthy = False
    failure_reason = "verification window expired before telemetry normalised"
    while asyncio.get_running_loop().time() < deadline:
        await asyncio.sleep(5)
        async with httpx.AsyncClient(timeout=5) as client:
            state_response = await client.get(f"{settings.FAILURE_INJECTOR_URL}/state")
            injector_state = state_response.json()
        fresh_metrics = await prometheus_collector.collect_all_metrics()
        current = next((m for m in fresh_metrics if m["service"] == action.incident.service), None)
        after = await collect_incident_evidence(action.incident, db)
        services_healthy = all(
            after["service_health"][name].get("status_code") == 200
            for name in ("api", "worker")
        )
        targets_healthy = all(
            after["prometheus_target_health"][name].get("healthy")
            for name in ("api", "worker")
        )
        if not injector_state.get(failure_kind, True) and services_healthy and targets_healthy and current and _anomaly_cleared(current, action.incident.service, action.action_type):
            # Persist a fresh, observed post-recovery sample so websocket/API
            # consumers move without a browser reload.
            await telemetry_collector.collect_and_store()
            healthy = True
            failure_reason = None
            break
        failure_reason = {
            "injector_state": injector_state,
            "services_healthy": services_healthy,
            "prometheus_targets_healthy": targets_healthy,
            "fresh_metric": current,
        }
    result = {"before": before, "execution": execution, "after": after,
              "fresh_prometheus_metrics": fresh_metrics, "healthy": healthy,
              "failure_reason": failure_reason}
    action.execution_log = json.dumps(execution)
    action.verification_result = json.dumps(result)
    action.executed_at = datetime.utcnow()
    action.status = "executed" if healthy else "failed"
    if healthy:
        action.incident.status = "resolved"
        action.incident.resolved_at = datetime.utcnow()
        action.incident.resolution = json.dumps(result)
    else:
        # Keep the incident visible and actionable; a successful HTTP command
        # is not a successful recovery until verification proves it.
        action.incident.status = "recovery_failed"
        action.incident.resolution = json.dumps(result)
    db.commit(); db.refresh(action)
    return result

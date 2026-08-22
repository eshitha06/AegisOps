import json
from datetime import datetime
from backend.models.metric import Metric
from backend.models.incident import Incident


def run(db):
    # Find all services in the database for REAL mode
    services = [
        r[0]
        for r in db.query(Metric.service)
        .filter(Metric.source == "real")
        .distinct()
        .all()
    ]
    if not services:
        return None

    new_incident = None

    for service in services:
        latest = (
            db.query(Metric)
            .filter(Metric.service == service, Metric.source == "real")
            .order_by(Metric.recorded_at.desc())
            .first()
        )
        if not latest:
            continue

        # Normalize CPU/Memory percentages (handle both 0-1 and 0-100 formats)
        cpu = latest.cpu_usage
        if cpu <= 1.0:
            cpu = cpu * 100.0

        mem = latest.memory_usage
        if mem <= 1.0:
            mem = mem * 100.0

        # Threshold checks
        reasons = []
        if cpu > 90.0:
            reasons.append(f"CPU usage ({cpu:.1f}%) exceeded 90%")
        if mem > 90.0:
            reasons.append(f"Memory usage ({mem:.1f}%) exceeded 90%")
        if latest.error_rate > 0.05:
            reasons.append(f"Error rate ({latest.error_rate:.2f}/s) exceeded 0.05/s")
        if latest.latency_ms > 1500.0:
            reasons.append(f"Latency ({latest.latency_ms:.0f}ms) exceeded 1500ms")

        # Check for existing unresolved incident
        active_incident = (
            db.query(Incident)
            .filter(
                Incident.service == service,
                Incident.source == "real",
                Incident.status != "resolved",
            )
            .first()
        )

        if reasons:
            if not active_incident:
                # Determine severity
                severity = "critical" if (latest.error_rate > 0.2 or cpu > 95.0) else "high"
                title = f"{', '.join(reasons)} on {service}"

                initial_snapshot = {
                    "at": latest.recorded_at.isoformat() + "Z",
                    "cpu": latest.cpu_usage,
                    "memory": latest.memory_usage,
                    "errors_per_second": latest.error_rate,
                    "latency_ms": latest.latency_ms,
                    "requests_per_minute": latest.request_count,
                    "anomaly": True,
                    "reasons": reasons,
                }

                new_incident = Incident(
                    title=title,
                    service=service,
                    source="real",
                    status="open",
                    severity=severity,
                    created_at=datetime.utcnow(),
                    observed_evidence=json.dumps({"incident_metric": initial_snapshot}),
                )
                db.add(new_incident)
                db.commit()
                db.refresh(new_incident)
            elif active_incident.status in ("verifying", "recovery_pending"):
                # The condition has re-occurred, mark back to open
                active_incident.status = "open"
                db.commit()
                db.refresh(active_incident)
        else:
            # Condition is currently healthy; preserve open state for operator intervention
            pass

    return new_incident

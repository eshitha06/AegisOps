from datetime import datetime
from backend.models.metric import Metric
from backend.models.incident import Incident

def run(db):
    # Find all services in the database
    services = [r[0] for r in db.query(Metric.service).filter(Metric.source == "real").distinct().all()]
    if not services:
        return None

    for service in services:
        latest = (
            db.query(Metric)
            .filter(Metric.service == service, Metric.source == "real")
            .order_by(Metric.recorded_at.desc())
            .first()
        )
        if not latest:
            continue
            
        # Normalize CPU/Memory percentages (handle both 0-1 and 0-100 metrics formats)
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
            
        if reasons:
            # Check if there is an active (unresolved) incident for this service
            active_incident = (
                db.query(Incident)
                .filter(Incident.service == service, Incident.source == "real", Incident.status != "resolved")
                .first()
            )
            
            if not active_incident:
                # Determine severity
                severity = "critical" if (latest.error_rate > 0.2 or cpu > 95.0) else "high"
                title = f"{', '.join(reasons)} on {service}"
                
                new_incident = Incident(
                    title=title,
                    service=service,
                    source="real",
                    status="open",
                    severity=severity,
                    created_at=datetime.utcnow()
                )
                db.add(new_incident)
                db.commit()
                db.refresh(new_incident)
                return new_incident
                
    return None

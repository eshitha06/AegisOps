import traceback
from datetime import datetime
from backend.models.incident import Incident
from agents import monitoring_agent, anomaly_agent, rca_agent, recovery_agent

async def run_full_pipeline(metric, db):
    try:
        print(f"[{datetime.utcnow().strftime('%H:%M:%S')}] Starting full AegisOps pipeline for metric on service {metric.service}...")
        
        # 1. Run monitoring agent to check thresholds and optionally create incident
        incident = monitoring_agent.run(db)
        
        # 2. Run anomaly agent to check metric distribution
        anomaly_res = anomaly_agent.run(metric, db)
        is_anomaly = anomaly_res.get("is_anomaly", False)
        
        # 3. Create incident if anomaly detected and monitoring agent didn't already create one
        if is_anomaly and not incident:
            # Check for existing active (non-resolved) incident to prevent duplicates
            active_incident = (
                db.query(Incident)
                .filter(Incident.service == metric.service, Incident.source == "real", Incident.status != "resolved")
                .first()
            )
            
            if not active_incident:
                initial_snapshot = {
                    "at": metric.recorded_at.isoformat() + "Z",
                    "cpu": metric.cpu_usage,
                    "memory": metric.memory_usage,
                    "errors_per_second": metric.error_rate,
                    "latency_ms": metric.latency_ms,
                    "requests_per_minute": metric.request_count,
                    "anomaly": True,
                }
                import json
                incident = Incident(
                    title=f"Telemetry anomaly detected on {metric.service} (CPU/Memory distribution check)",
                    service=metric.service,
                    source="real",
                    status="open",
                    severity="high",
                    created_at=datetime.utcnow(),
                    observed_evidence=json.dumps({"incident_metric": initial_snapshot}),
                )
                db.add(incident)
                db.commit()
                db.refresh(incident)
                print(f"Created Incident ID: {incident.id} from Anomaly Agent detection")
        
        # If we have an active incident (either created now, or already existing)
        if incident:
            print(f"Processing Incident {incident.id} through RCA and Recovery pipeline...")
            
            # 4. Run RCA agent only if not already analyzed
            if not incident.rca_result:
                rca_res = await rca_agent.run(incident.id, db)
            else:
                import json
                try:
                    rca_res = json.loads(incident.rca_result)
                except Exception:
                    rca_res = await rca_agent.run(incident.id, db)
            
            # 5. Run Recovery agent
            recovery_res = recovery_agent.run(rca_res, incident.id, db)
            
            return {
                "incident_id": incident.id,
                "service": incident.service,
                "status": incident.status,
                "rca": rca_res,
                "recovery": recovery_res
            }
            
        print("Pipeline execution completed. No incidents active.")
        return None
    except Exception as e:
        print(f"CRITICAL: Pipeline execution failed: {e}")
        traceback.print_exc()
        # Ensure we return a structured fallback response rather than crashing the process
        return {
            "error": str(e),
            "status": "failed",
            "rca": {"root_cause": "System pipeline processing error.", "confidence": 0.0, "timeline": [], "recommendations": []},
            "recovery": {"actions": [], "estimated_recovery_minutes": 0, "confidence": 0.0}
        }

import numpy as np
from sqlalchemy.orm import Session
from backend.models.metric import Metric

class PredictionService:
    def predict_status(self, service: str, db: Session):
        # Retrieve recent metrics
        metrics = (db.query(Metric).filter(Metric.service == service, Metric.source == "real")
                   .order_by(Metric.recorded_at.desc()).limit(20).all())
        if len(metrics) < 5:
            return {
                "service": service,
                "risk_score": None,
                "estimated_time_to_failure_minutes": None,
                "status": "insufficient_data",
                "trend_direction": "unknown",
                "metric": "latency_ms",
                "current_value": None,
                "data_points": len(metrics),
                "data_window_start": metrics[-1].recorded_at.isoformat() + "Z" if metrics else None,
                "data_window_end": metrics[0].recorded_at.isoformat() + "Z" if metrics else None,
                "confidence": None,
            }
        
        # Calculate averages and trend lines
        latencies = [m.latency_ms for m in metrics][::-1]
        errors = [m.error_rate for m in metrics][::-1]
        
        if len(latencies) > 1:
            x = np.arange(len(latencies))
            # Fit polynomial degree 1 (linear regression)
            latency_slope = float(np.polyfit(x, latencies, 1)[0])
            error_slope = float(np.polyfit(x, errors, 1)[0])
        else:
            latency_slope = 0.0
            error_slope = 0.0
            
        avg_latency = float(np.mean(latencies))
        avg_error = float(np.mean(errors))
        
        # Compute a simple heuristic risk score
        risk_score = 0.0
        if avg_latency > 1000 or latency_slope > 10:
            risk_score += 0.3
        if avg_error > 2.0 or error_slope > 0.1:
            risk_score += 0.4
        
        risk_score = min(1.0, risk_score)
        
        status = "healthy"
        if risk_score > 0.7:
            status = "critical"
        elif risk_score > 0.3:
            status = "warning"
            
        trend = "stable"
        if latency_slope > 5 or error_slope > 0.05:
            trend = "degrading"
        elif latency_slope < -5 and error_slope < -0.05:
            trend = "improving"
            
        etf = None
        if trend == "degrading":
            etf = max(5, int((1500 - avg_latency) / (latency_slope + 0.1)))
            
        # Confidence is a transparent data-quality signal, not an accuracy
        # claim: it is based solely on sample count in the observed window.
        return {
            "service": service,
            "risk_score": float(risk_score),
            "estimated_time_to_failure_minutes": etf,
            "status": status,
            "trend_direction": trend,
            "metric": "latency_ms",
            "current_value": latencies[-1],
            "data_points": len(metrics),
            "data_window_start": metrics[-1].recorded_at.isoformat() + "Z",
            "data_window_end": metrics[0].recorded_at.isoformat() + "Z",
            "confidence": round(min(1.0, len(metrics) / 20), 2),
        }

prediction_service = PredictionService()

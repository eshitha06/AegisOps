from typing import Dict, Any, Tuple

class RiskScoringEngine:
    @staticmethod
    def calculate_risk(metric: Dict[str, Any], is_anomaly: bool, anomaly_score: float) -> Tuple[float, str]:
        cpu = float(metric.get("cpu_usage", 0))
        mem = float(metric.get("memory_usage", 0))
        error_rate = float(metric.get("error_rate", 0))
        latency = float(metric.get("latency_ms", 0))

        # Weight metrics
        w_cpu, w_mem, w_error, w_latency, w_anomaly = 0.15, 0.15, 0.25, 0.25, 0.20

        s_cpu = min(100.0, cpu)
        s_mem = min(100.0, mem)
        s_error = min(100.0, (error_rate / 100.0) * 100.0)
        s_latency = min(100.0, (latency / 3000.0) * 100.0)
        s_anomaly = anomaly_score * 100.0

        base_risk = (s_cpu * w_cpu) + (s_mem * w_mem) + (s_error * w_error) + (s_latency * w_latency) + (s_anomaly * w_anomaly)

        if error_rate > 50.0 or cpu > 95.0 or latency > 5000.0:
            base_risk = max(base_risk, 90.0)
        elif is_anomaly:
            base_risk = max(base_risk, 65.0)

        final_score = float(min(100.0, max(0.0, base_risk)))

        if final_score >= 85.0:
            level = "CRITICAL"
        elif final_score >= 60.0:
            level = "HIGH"
        elif final_score >= 35.0:
            level = "MEDIUM"
        else:
            level = "LOW"

        return round(final_score, 2), level

risk_engine = RiskScoringEngine()
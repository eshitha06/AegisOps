from typing import Dict, Any, Tuple

class RecommendationEngine:
    @staticmethod
    def generate_analysis(metric: Dict[str, Any], risk_level: str, is_anomaly: bool) -> Tuple[str, str]:
        cpu = float(metric.get("cpu_usage", 0))
        mem = float(metric.get("memory_usage", 0))
        error_rate = float(metric.get("error_rate", 0))
        latency = float(metric.get("latency_ms", 0))

        causes = []
        actions = []

        if cpu > 90.0:
            causes.append(f"CPU usage exceeded 90% ({cpu}%)")
            actions.append("Scale service horizontal replicas.")
        if mem > 90.0:
            causes.append(f"Memory leakage risk detected ({mem}%)")
            actions.append("Restart unhealthy pods.")
        if error_rate > 5.0:
            causes.append(f"Error rate spiked ({error_rate}%)")
            actions.append("Check database connections.")
        if latency > 1500.0:
            causes.append(f"High latency detected ({latency}ms)")
            actions.append("Investigate API latency bottleneck.")

        if not causes:
            if is_anomaly:
                causes.append("Unusual multi-metric distribution configuration detected.")
                actions.append("Inspect system tracing infrastructure.")
            else:
                causes.append("System operating within normal threshold limits.")
                actions.append("No action required.")

        return " | ".join(causes), " | ".join(actions)

recommendation_engine = RecommendationEngine()
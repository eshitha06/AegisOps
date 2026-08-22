import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

import httpx
from backend.config import settings

logger = logging.getLogger(__name__)


class PrometheusCollector:
    def __init__(self, prometheus_url: str = None):
        self.prometheus_url = prometheus_url or settings.PROMETHEUS_URL
        self.client = httpx.AsyncClient(timeout=10.0)
        self._demo_mode = settings.DEMO_MODE

    async def close(self):
        await self.client.aclose()

    async def query(self, query: str) -> Optional[Dict[str, Any]]:
        try:
            response = await self.client.get(
                f"{self.prometheus_url}/api/v1/query",
                params={"query": query}
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "success":
                return data.get("data", {}).get("result", [])
            return None
        except Exception as e:
            logger.error(f"Prometheus query failed: {e}")
            return None

    async def query_range(self, query: str, start: str, end: str, step: str = "15s") -> Optional[Dict[str, Any]]:
        try:
            response = await self.client.get(
                f"{self.prometheus_url}/api/v1/query_range",
                params={"query": query, "start": start, "end": end, "step": step}
            )
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "success":
                return data.get("data", {}).get("result", [])
            return None
        except Exception as e:
            logger.error(f"Prometheus query_range failed: {e}")
            return None

    def _parse_metric_value(self, result: List[Dict]) -> Optional[float]:
        if not result:
            return None
        try:
            value = result[0].get("value", [None, None])[1]
            if value is None:
                return None
            parsed = float(value)
            return parsed if parsed == parsed and parsed not in (float("inf"), float("-inf")) else None
        except (IndexError, ValueError, TypeError):
            return None

    def _sum_metric_values(self, result: List[Dict]) -> Optional[float]:
        """Sum an instant-vector so pid/status-labelled series are retained."""
        if not result:
            return None
        values = []
        for sample in result:
            try:
                value = float(sample.get("value", [None, None])[1])
                if value == value and value not in (float("inf"), float("-inf")):
                    values.append(value)
            except (IndexError, TypeError, ValueError):
                continue
        return sum(values) if values else None

    def _get_label(self, result: List[Dict], label: str) -> Optional[str]:
        if not result:
            return None
        return result[0].get("metric", {}).get(label)

    async def collect_service_metrics(self, service: str) -> Dict[str, Any]:
        prefix = service.replace("-", "_")

        cpu_query = f'{prefix}_cpu_usage_percent'
        mem_query = f'{prefix}_memory_usage_bytes'
        req_count_query = f'rate({prefix}_requests_total[1m])'
        error_rate_query = f'rate({prefix}_errors_total[1m])'
        latency_query = f'histogram_quantile(0.95, sum(rate({prefix}_request_latency_seconds_bucket[5m])) by (le))'

        if service == "worker":
            cpu_query = 'worker_cpu_usage_percent'
            mem_query = 'worker_memory_usage_bytes'
            req_count_query = 'rate(worker_jobs_processed_total[1m])'
            error_rate_query = 'rate(worker_jobs_failed_total[1m])'
            latency_query = 'histogram_quantile(0.95, sum(rate(worker_job_latency_seconds_bucket[5m])) by (le))'

        cpu_result = await self.query(cpu_query)
        mem_result = await self.query(mem_query)
        req_count_result = await self.query(req_count_query)
        error_rate_result = await self.query(error_rate_query)
        latency_result = await self.query(latency_query)

        cpu_percent = self._sum_metric_values(cpu_result)
        mem_bytes = self._sum_metric_values(mem_result)
        req_count = self._sum_metric_values(req_count_result)
        error_rate = self._sum_metric_values(error_rate_result)
        latency_seconds = self._parse_metric_value(latency_result)

        cpu_usage = (cpu_percent or 0.0) / 100.0 if cpu_percent else 0.0
        # The demo exposes RSS bytes but no container memory limit.  Persist a
        # bounded ratio for the existing schema; it is derived solely from the
        # live RSS gauge and is never fabricated.
        memory_usage = min((mem_bytes or 0.0) / (1024 * 1024 * 1024), 1.0) if mem_bytes else 0.0
        request_count = int(req_count * 60) if req_count else 0
        error_rate_val = error_rate if error_rate else 0.0
        latency_ms = (latency_seconds * 1000) if latency_seconds else 0.0

        return {
            "service": service,
            "cpu_usage": round(min(max(cpu_usage, 0.0), 1.0), 4),
            "memory_usage": round(min(max(memory_usage, 0.0), 1.0), 4),
            "error_rate": round(error_rate_val, 4),
            "latency_ms": round(latency_ms, 1),
            "request_count": max(request_count, 0),
            "is_anomaly": False,
            "recorded_at": datetime.utcnow().isoformat() + "Z"
        }

    async def collect_all_metrics(self) -> List[Dict[str, Any]]:
        # REAL mode is intentionally limited to standalone demo-env workloads.
        services = ["api", "worker"]
        metrics = []
        for service in services:
            try:
                metric = await self.collect_service_metrics(service)
                metrics.append(metric)
            except Exception as e:
                logger.error(f"Failed to collect metrics for {service}: {e}")
        return metrics

    async def get_service_health(self, service: str) -> Dict[str, Any]:
        health_query = f'up{{job="{service}"}}'
        result = await self.query(health_query)
        is_up = self._parse_metric_value(result) == 1.0
        return {"service": service, "healthy": is_up, "timestamp": datetime.utcnow().isoformat() + "Z"}


prometheus_collector = PrometheusCollector()

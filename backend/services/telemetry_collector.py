import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import SessionLocal
from backend.models.metric import Metric
from backend.services.prometheus_collector import prometheus_collector
from agents.pipeline import run_full_pipeline
from agents.anomaly_agent import run as run_anomaly_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TelemetryCollector:
    def __init__(self, poll_interval: int = None):
        self.poll_interval = poll_interval or settings.POLL_INTERVAL_SECONDS
        self._running = False
        self._task: asyncio.Task = None

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._collect_loop())
        logger.info(f"Telemetry collector started (interval: {self.poll_interval}s)")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Telemetry collector stopped")

    async def close(self):
        await prometheus_collector.close()

    async def _collect_loop(self):
        while self._running:
            try:
                await self.collect_and_store()
            except Exception as e:
                logger.error(f"Telemetry collection error: {e}")
            await asyncio.sleep(self.poll_interval)

    async def collect_and_store(self) -> List[Dict[str, Any]]:
        if settings.TELEMETRY_MODE == "demo":
            logger.debug("Telemetry mode is demo, skipping real collection")
            return []

        metrics_data = await prometheus_collector.collect_all_metrics()
        stored_metrics = []

        for metric_data in metrics_data:
            db = SessionLocal()
            try:
                db_metric = Metric(
                    service=metric_data["service"],
                    source="real",
                    cpu_usage=metric_data["cpu_usage"],
                    memory_usage=metric_data["memory_usage"],
                    error_rate=metric_data["error_rate"],
                    latency_ms=metric_data["latency_ms"],
                    request_count=metric_data["request_count"],
                    is_anomaly=False
                )
                db.add(db_metric)
                db.commit()
                db.refresh(db_metric)

                # The pipeline performs anomaly analysis itself and turns real
                # persisted telemetry into incidents/recommendations.
                await run_full_pipeline(db_metric, db)

                anomaly_res = run_anomaly_agent(db_metric, db)
                if anomaly_res.get("is_anomaly"):
                    db_metric.is_anomaly = True
                    db.commit()
                    db.refresh(db_metric)

                stored_metrics.append({
                    "id": db_metric.id,
                    "service": db_metric.service,
                    "cpu_usage": db_metric.cpu_usage,
                    "memory_usage": db_metric.memory_usage,
                    "error_rate": db_metric.error_rate,
                    "latency_ms": db_metric.latency_ms,
                    "request_count": db_metric.request_count,
                    "is_anomaly": db_metric.is_anomaly,
                    "recorded_at": db_metric.recorded_at.isoformat() + "Z"
                })
                logger.info(f"Stored metric for {metric_data['service']}: cpu={metric_data['cpu_usage']:.2%}, mem={metric_data['memory_usage']:.2%}, err={metric_data['error_rate']:.4f}, lat={metric_data['latency_ms']:.1f}ms")
            except Exception as e:
                logger.error(f"Failed to store metric for {metric_data.get('service', 'unknown')}: {e}")
                db.rollback()
            finally:
                db.close()

        return stored_metrics


telemetry_collector = TelemetryCollector()

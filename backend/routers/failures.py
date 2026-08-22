import httpx
from fastapi import APIRouter, HTTPException
from backend.config import settings

router = APIRouter(prefix="/api/failures", tags=["failures"])


@router.get("/state")
async def get_failure_state():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{settings.FAILURE_INJECTOR_URL}/state")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/cpu")
async def trigger_cpu_failure():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/failures/cpu")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/memory")
async def trigger_memory_failure():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/failures/memory")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/latency")
async def trigger_latency_failure():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/failures/latency")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/errors")
async def trigger_errors_failure():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/failures/errors")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/database")
async def trigger_database_failure():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/failures/database")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/worker")
async def trigger_worker_failure():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/failures/worker")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/recover")
async def recover_all():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/recover")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")


@router.post("/recover/{kind}")
async def recover_specific(kind: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(f"{settings.FAILURE_INJECTOR_URL}/recover/{kind}")
            return resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Failure injector unreachable: {exc}")

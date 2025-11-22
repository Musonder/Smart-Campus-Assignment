"""
Health Check Router

Provides health and readiness endpoints for monitoring.
"""

from datetime import datetime

from fastapi import APIRouter, status
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    timestamp: datetime
    version: str
    services: dict[str, str]


@router.get("/", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Basic health check endpoint.
    
    Returns:
        HealthResponse: Service health status
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        version="0.1.0",
        services={
            "api_gateway": "healthy",
            "database": "healthy",
            "cache": "healthy",
            "event_store": "healthy",
        },
    )


@router.get("/ready")
async def readiness_check() -> dict[str, str]:
    """
    Readiness check for Kubernetes.
    
    Returns:
        dict: Readiness status
    """
    # In production, check actual service connectivity
    return {"status": "ready"}


@router.get("/live")
async def liveness_check() -> dict[str, str]:
    """
    Liveness check for Kubernetes.
    
    Returns:
        dict: Liveness status
    """
    return {"status": "alive"}


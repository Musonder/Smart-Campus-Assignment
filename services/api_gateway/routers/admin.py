"""
Admin-specific endpoint proxies.
"""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Request
import httpx
import structlog

from shared.config import settings
from shared.database.mongodb import get_mongodb

router = APIRouter(prefix="/admin", tags=["admin"])
logger = structlog.get_logger(__name__)


@router.get("/users")
async def list_all_users(
    request: Request,
    user_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Proxy to User Service for admin user management."""
    try:
        # Extract Authorization header from request
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        params = {
            "limit": limit,
            "offset": offset,
        }
        if user_type:
            params["user_type"] = user_type
        if is_active is not None:
            params["is_active"] = is_active

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"http://localhost:{settings.user_service_port}/api/v1/admin/users",
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        logger.error("Failed to proxy admin users", error=str(e))
        raise HTTPException(status_code=503, detail="User Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error proxying admin users", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/stats")
async def get_user_statistics(
    request: Request,
):
    """Proxy to User Service for user statistics."""
    try:
        # Extract Authorization header from request
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"http://localhost:{settings.user_service_port}/api/v1/admin/users/stats",
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        logger.error("Failed to proxy user statistics", error=str(e))
        raise HTTPException(status_code=503, detail="User Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error proxying user statistics", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_system_statistics(
    request: Request,
):
    """
    Get comprehensive system statistics aggregated from all services.
    
    Returns flat structure matching frontend SystemStats interface.
    """
    # Extract Authorization header from request
    headers = {}
    auth_header = request.headers.get("Authorization")
    if auth_header:
        headers["Authorization"] = auth_header
    
    # Initialize default values
    total_users = 0
    active_users = 0
    total_courses = 0
    active_enrollments = 0
    total_facilities = 0
    active_bookings = 0
    event_store_events = 0
    services_online = 0
    total_services = 4  # user, academic, facility, analytics
    system_health = "healthy"
    
    # Get user statistics
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"http://localhost:{settings.user_service_port}/api/v1/admin/users/stats",
                headers=headers,
            )
            if response.status_code == 200:
                user_stats = response.json()
                total_users = user_stats.get("total_users", 0)
                active_users = user_stats.get("active_users", 0)
    except Exception as e:
        logger.warning("Failed to fetch user stats", error=str(e))
        system_health = "degraded"
    
    # Get academic statistics
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"http://localhost:{settings.academic_service_port}/api/v1/admin/stats",
                headers=headers,
            )
            if response.status_code == 200:
                academic_stats = response.json()
                total_courses = academic_stats.get("total_courses", 0)
                active_enrollments = academic_stats.get("active_enrollments", 0)
    except Exception as e:
        logger.warning("Failed to fetch academic stats", error=str(e))
        system_health = "degraded"
    
    # Get facility statistics
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"http://localhost:{settings.facility_service_port}/api/v1/admin/stats",
                headers=headers,
            )
            if response.status_code == 200:
                facility_stats = response.json()
                total_facilities = facility_stats.get("total_facilities", 0)
                active_bookings = facility_stats.get("active_bookings", 0)
    except Exception as e:
        logger.warning("Failed to fetch facility stats", error=str(e))
        system_health = "degraded"
    
    # Get event store statistics from MongoDB
    try:
        db = await get_mongodb()
        events_collection = db["events"]
        event_store_events = await events_collection.count_documents({})
    except Exception as e:
        logger.warning("Failed to fetch event store stats", error=str(e))
        system_health = "degraded"
    
    # Check service health
    services_to_check = {
        "user_service": f"http://localhost:{settings.user_service_port}/health",
        "academic_service": f"http://localhost:{settings.academic_service_port}/health",
        "facility_service": f"http://localhost:{settings.facility_service_port}/health",
        "analytics_service": f"http://localhost:{settings.analytics_service_port}/health",
    }
    
    for service_name, health_url in services_to_check.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(health_url)
                if response.status_code == 200:
                    services_online += 1
        except Exception as e:
            logger.warning(f"Failed to check {service_name} health", error=str(e))
            system_health = "degraded"
    
    # Determine overall system health
    if services_online < total_services:
        system_health = "degraded"
    if services_online < total_services / 2:
        system_health = "critical"
    
    # Return flat structure matching frontend interface
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_courses": total_courses,
        "active_enrollments": active_enrollments,
        "total_facilities": total_facilities,
        "active_bookings": active_bookings,
        "system_health": system_health,
        "services_online": services_online,
        "total_services": total_services,
        "event_store_events": event_store_events,
        "audit_logs_count": event_store_events,  # Using event store count as proxy
        "ml_models_active": 0,  # Placeholder - will be implemented when ML service is ready
        "plugins_loaded": 0,  # Placeholder - will be implemented when plugin system is ready
    }


@router.get("/activity")
async def get_recent_activity(
    request: Request,
    limit: int = 10,
):
    """
    Get recent system activity from event store.
    
    Args:
        limit: Maximum number of activities to return
        
    Returns:
        List of recent activities matching frontend RecentActivity interface
    """
    try:
        db = await get_mongodb()
        events_collection = db["events"]
        
        # Get most recent events
        cursor = events_collection.find().sort("timestamp", -1).limit(limit)
        activities = []
        
        async for event in cursor:
            event_type = event.get("event_type", "unknown")
            # Map event types to severity
            severity_map = {
                "error": "error",
                "warning": "warning",
                "user_registered": "success",
                "enrollment_created": "success",
                "course_created": "success",
            }
            severity = severity_map.get(event_type.lower(), "info")
            
            # Get user info if available
            user_id = event.get("user_id")
            user_str = str(user_id) if user_id else "System"
            
            # Get description
            description = event.get("description", event_type.replace("_", " ").title())
            
            # Get timestamp
            timestamp = event.get("timestamp")
            if isinstance(timestamp, datetime):
                timestamp_str = timestamp.isoformat()
            else:
                timestamp_str = str(timestamp) if timestamp else datetime.utcnow().isoformat()
            
            activities.append({
                "id": str(event.get("_id", "")),
                "type": event_type,
                "description": description,
                "timestamp": timestamp_str,
                "user": user_str,
                "severity": severity,
            })
        
        # If no events, return empty list (frontend handles empty state)
        return activities
    
    except Exception as e:
        logger.error("Failed to fetch recent activity", error=str(e))
        # Return empty list instead of raising error - frontend handles empty state
        return []


@router.get("/enrollments")
async def get_admin_enrollments(
    request: Request,
    section_id: Optional[str] = None,
    course_id: Optional[str] = None,
):
    """Proxy to Academic Service for admin enrollment viewing."""
    try:
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        params = {}
        if section_id:
            params["section_id"] = section_id
        if course_id:
            params["course_id"] = course_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"http://localhost:{settings.academic_service_port}/api/v1/admin/enrollments",
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        logger.error("Failed to proxy admin enrollments", error=str(e))
        raise HTTPException(status_code=503, detail="Academic Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error proxying admin enrollments", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ml/models")
async def get_ml_models(
    request: Request,
):
    """
    Get ML models status.
    
    Returns:
        List of ML models
    """
    # Placeholder - will be implemented when ML service is ready
    # For now, return empty list or basic structure
    return [
        {
            "id": "enrollment_predictor",
            "name": "Enrollment Dropout Predictor",
            "type": "enrollment_predictor",
            "version": "1.0.0",
            "status": "inactive",
            "accuracy": None,
            "last_trained": datetime.utcnow().isoformat(),
            "predictions_count": 0,
        },
        {
            "id": "room_optimizer",
            "name": "Room Usage Optimizer",
            "type": "room_optimizer",
            "version": "1.0.0",
            "status": "inactive",
            "accuracy": None,
            "last_trained": datetime.utcnow().isoformat(),
            "predictions_count": 0,
        },
    ]


@router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Get audit logs from event store.
    
    Args:
        search: Search term for filtering logs
        limit: Maximum number of logs to return
        offset: Number of logs to skip
        
    Returns:
        List of audit log entries
    """
    try:
        db = await get_mongodb()
        events_collection = db["events"]
        
        # Build query
        query = {}
        if search:
            query["$or"] = [
                {"event_type": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        
        # Get audit logs
        cursor = events_collection.find(query).sort("timestamp", -1).skip(offset).limit(limit)
        logs = []
        
        async for event in cursor:
            # Map event to audit log format
            result = "success"
            if "error" in event.get("event_type", "").lower():
                result = "failure"
            elif "warning" in event.get("event_type", "").lower():
                result = "warning"
            
            logs.append({
                "id": str(event.get("_id", "")),
                "timestamp": event.get("timestamp", datetime.utcnow()).isoformat() if isinstance(event.get("timestamp"), datetime) else str(event.get("timestamp", "")),
                "user_id": str(event.get("user_id", "")) if event.get("user_id") else "",
                "user_email": event.get("user_email", "system@argos.edu"),
                "action": event.get("event_type", "unknown"),
                "resource": event.get("resource", "system"),
                "result": result,
                "ip_address": event.get("ip_address", "0.0.0.0"),
                "user_agent": event.get("user_agent", "Unknown"),
                "hash": event.get("hash", ""),
                "previous_hash": event.get("previous_hash", ""),
            })
        
        return logs
    
    except Exception as e:
        logger.error("Failed to fetch audit logs", error=str(e))
        return []


@router.get("/plugins")
async def get_plugins(
    request: Request,
):
    """
    Get plugin system status.
    
    Returns:
        List of plugins
    """
    # Placeholder - will be implemented when plugin system is ready
    return [
        {
            "id": "enrollment_policy",
            "name": "Enrollment Policy Engine",
            "version": "1.0.0",
            "status": "loaded",
            "description": "Policy-driven enrollment validation",
            "can_reload": False,
        },
        {
            "id": "audit_logger",
            "name": "Audit Logger",
            "version": "1.0.0",
            "status": "loaded",
            "description": "Tamper-evident audit logging",
            "can_reload": False,
        },
    ]


@router.post("/plugins/{plugin_id}/reload")
async def reload_plugin(
    plugin_id: str,
    request: Request,
):
    """
    Reload a plugin (hot-reload).
    
    Args:
        plugin_id: ID of the plugin to reload
        
    Returns:
        Success message
    """
    # Placeholder - will be implemented when plugin system is ready
    return {
        "message": f"Plugin {plugin_id} reloaded successfully",
        "plugin_id": plugin_id,
    }


@router.get("/services")
async def get_services(
    request: Request,
):
    """
    Get service health status.
    
    Returns:
        List of services with their status
    """
    services = [
        {
            "name": "User Service",
            "port": settings.user_service_port,
            "status": "offline",
            "health": "unknown",
        },
        {
            "name": "Academic Service",
            "port": settings.academic_service_port,
            "status": "offline",
            "health": "unknown",
        },
        {
            "name": "Facility Service",
            "port": settings.facility_service_port,
            "status": "offline",
            "health": "unknown",
        },
        {
            "name": "Analytics Service",
            "port": settings.analytics_service_port,
            "status": "offline",
            "health": "unknown",
        },
    ]
    
    # Check each service
    service_urls = {
        "User Service": f"http://localhost:{settings.user_service_port}/health",
        "Academic Service": f"http://localhost:{settings.academic_service_port}/health",
        "Facility Service": f"http://localhost:{settings.facility_service_port}/health",
        "Analytics Service": f"http://localhost:{settings.analytics_service_port}/health",
    }
    
    for service in services:
        service_name = service["name"]
        health_url = service_urls.get(service_name)
        if health_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(health_url)
                    if response.status_code == 200:
                        service["status"] = "online"
                        service["health"] = response.json().get("status", "healthy")
                    else:
                        service["status"] = "degraded"
                        service["health"] = f"HTTP {response.status_code}"
            except Exception as e:
                service["status"] = "offline"
                service["health"] = "unavailable"
    
    return services


@router.post("/settings")
async def save_settings(
    settings_data: dict,
    request: Request,
):
    """
    Save system settings.
    
    Args:
        settings_data: Settings to save
        
    Returns:
        Success message
    """
    # Store settings in MongoDB for persistence
    try:
        db = await get_mongodb()
        settings_collection = db["system_settings"]
        
        # Update or insert settings
        await settings_collection.update_one(
            {"_id": "system_config"},
            {"$set": {"settings": settings_data, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        
        logger.info("System settings saved", settings_keys=list(settings_data.keys()))
        
        return {
            "message": "Settings saved successfully",
            "settings": settings_data,
        }
    except Exception as e:
        logger.error("Failed to save settings", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to save settings")


@router.get("/security/incidents")
async def get_security_incidents(
    request: Request,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    limit: int = 50,
):
    """
    Get security incidents from event store.
    
    Args:
        severity: Filter by severity (low/medium/high/critical)
        resolved: Filter by resolved status
        limit: Maximum number of incidents to return
        
    Returns:
        List of security incidents
    """
    try:
        db = await get_mongodb()
        events_collection = db["events"]
        
        # Build query for security-related events
        query = {
            "$or": [
                {"event_type": {"$regex": "unauthorized|breach|violation|suspicious", "$options": "i"}},
                {"severity": {"$exists": True}},
            ]
        }
        
        if severity:
            query["severity"] = severity
        if resolved is not None:
            query["resolved"] = resolved
        
        # Get incidents
        cursor = events_collection.find(query).sort("timestamp", -1).limit(limit)
        incidents = []
        
        async for event in cursor:
            # Determine incident type from event
            event_type = event.get("event_type", "").lower()
            incident_type = "suspicious_activity"
            if "unauthorized" in event_type or "access" in event_type:
                incident_type = "unauthorized_access"
            elif "breach" in event_type or "data" in event_type:
                incident_type = "data_breach"
            elif "violation" in event_type or "policy" in event_type:
                incident_type = "policy_violation"
            
            # Determine severity
            severity_level = event.get("severity", "low")
            if "critical" in event_type or "breach" in event_type:
                severity_level = "critical"
            elif "high" in event_type or "unauthorized" in event_type:
                severity_level = "high"
            elif "warning" in event_type or "violation" in event_type:
                severity_level = "medium"
            
            incidents.append({
                "id": str(event.get("_id", "")),
                "type": incident_type,
                "severity": severity_level,
                "description": event.get("description", event_type.replace("_", " ").title()),
                "timestamp": event.get("timestamp", datetime.utcnow()).isoformat() if isinstance(event.get("timestamp"), datetime) else str(event.get("timestamp", "")),
                "resolved": event.get("resolved", False),
            })
        
        # If no incidents found, return empty list (frontend handles empty state)
        return incidents
    
    except Exception as e:
        logger.error("Failed to fetch security incidents", error=str(e))
        return []


@router.post("/gdpr/erase/{user_id}")
async def gdpr_erase_user_data(
    user_id: str,
    request: Request,
):
    """
    GDPR data erasure - pseudonymize user data.
    
    Args:
        user_id: User ID to erase
        
    Returns:
        Success message
    """
    try:
        # Extract Authorization header
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Call User Service to erase data
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"http://localhost:{settings.user_service_port}/api/v1/admin/gdpr/erase/{user_id}",
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
    
    except httpx.RequestError as e:
        logger.error("Failed to erase user data", error=str(e))
        raise HTTPException(status_code=503, detail="User Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error erasing user data", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/generate")
async def generate_report(
    report_data: dict,
    request: Request,
):
    """
    Generate admin reports (JSON, CSV, PDF).
    
    Args:
        report_data: Report generation request
        
    Returns:
        Report data in requested format
    """
    try:
        report_type = report_data.get("type", "admin_summary")
        format_type = report_data.get("format", "json")
        
        # Extract Authorization header
        headers = {}
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Generate report based on type
        if report_type == "admin_summary":
            # Get system stats
            stats_response = await get_system_statistics(request)
            
            if format_type == "json":
                return stats_response
            elif format_type == "csv":
                # Convert to CSV
                import io
                import csv
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(["Metric", "Value"])
                for key, value in stats_response.items():
                    writer.writerow([key, value])
                return output.getvalue()
            elif format_type == "pdf":
                # For PDF, return JSON for now (PDF generation requires additional libraries)
                return stats_response
        
        elif report_type == "compliance_audit":
            # Get audit logs
            audit_logs = await get_audit_logs(request, limit=1000)
            
            if format_type == "json":
                return audit_logs
            elif format_type == "csv":
                import io
                import csv
                output = io.StringIO()
                if audit_logs:
                    writer = csv.DictWriter(output, fieldnames=audit_logs[0].keys())
                    writer.writeheader()
                    writer.writerows(audit_logs)
                return output.getvalue()
            else:
                return audit_logs
        
        return {"message": "Report generated", "type": report_type, "format": format_type}
    
    except Exception as e:
        logger.error("Failed to generate report", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


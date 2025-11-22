"""
Academic Router

Handles academic operations: courses, enrollment, grades, etc.
Proxies requests to Academic Service.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query, Header, Request
from pydantic import BaseModel, Field
import httpx
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter()

# Academic Service URL
ACADEMIC_SERVICE_URL = "http://localhost:8002/api/v1"

# Grades endpoints proxy
@router.post("/grades", status_code=status.HTTP_201_CREATED)
async def create_grade(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Proxy grade creation to Academic Service."""
    try:
        request_data = await request.json()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ACADEMIC_SERVICE_URL}/academic/grades",
                json=request_data,
                headers={"Authorization": authorization} if authorization else {},
            )
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        logger.error("Grade creation failed", status_code=e.response.status_code, detail=e.response.text)
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        logger.error("Grade creation request failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create grade")
    except Exception as e:
        logger.error("Unexpected error creating grade", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grades")
async def list_grades(
    student_id: Optional[UUID] = Query(None),
    section_id: Optional[UUID] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """Proxy grade listing to Academic Service."""
    try:
        params = {}
        if student_id:
            params["student_id"] = str(student_id)
        if section_id:
            params["section_id"] = str(section_id)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{ACADEMIC_SERVICE_URL}/academic/grades",
                params=params,
                headers={"Authorization": authorization} if authorization else {},
            )
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        logger.error("Grade listing failed", status_code=e.response.status_code)
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        logger.error("Grade listing request failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list grades")
    except Exception as e:
        logger.error("Unexpected error listing grades", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# Also create a direct courses router for /api/v1/courses
courses_router = APIRouter()


# Request/Response Models
class CourseResponse(BaseModel):
    """Course information response."""

    id: UUID
    course_code: str
    title: str
    description: str
    credits: int
    department: str
    prerequisites: list[str]
    level: str


class SectionResponse(BaseModel):
    """Section information response.

    NOTE: This model is intentionally aligned with the Academic Service
    `SectionResponse` so the API Gateway can transparently proxy data
    without response validation errors. Some fields (like instructor_name
    and room_number) may not always be present and are therefore optional.
    """

    id: UUID
    course_id: UUID
    course_code: str
    course_title: str
    section_number: str
    semester: str
    instructor_id: UUID
    instructor_name: Optional[str] = None
    schedule_days: list[str]
    start_time: str
    end_time: str
    room_id: Optional[UUID] = None
    room_number: Optional[str] = None
    max_enrollment: int
    current_enrollment: int
    waitlist_size: int
    max_waitlist: int
    is_full: bool
    has_waitlist_space: Optional[bool] = None
    start_date: date
    end_date: date
    add_drop_deadline: date
    withdrawal_deadline: date
    created_at: datetime


class EnrollmentRequest(BaseModel):
    """Enrollment request."""

    student_id: UUID
    section_id: UUID


class EnrollmentResponse(BaseModel):
    """Enrollment response."""

    id: UUID
    student_id: UUID
    section_id: UUID
    course_code: str
    enrollment_status: str
    is_waitlisted: bool
    waitlist_position: Optional[int]
    enrolled_at: datetime


async def _list_courses(
    department: Optional[str] = None,
    level: Optional[str] = None,
    semester: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    authorization: Optional[str] = None,
) -> list[CourseResponse]:
    """
    List available courses with filtering.
    
    Proxies to Academic Service.
    """
    logger.info("List courses", department=department, level=level, semester=semester)

    try:
        params = {"skip": skip, "limit": limit}
        if department:
            params["department"] = department
        if level:
            params["level"] = level
        if semester:
            params["semester"] = semester
            
        headers = {}
        if authorization:
            headers["Authorization"] = authorization

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ACADEMIC_SERVICE_URL}/courses",
                params=params,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                try:
                    error_data = response.json()
                    detail = error_data.get("detail", "Failed to fetch courses")
                except:
                    detail = f"Failed to fetch courses: {response.text[:200]}"
                
                raise HTTPException(status_code=response.status_code, detail=detail)
                
    except httpx.RequestError as e:
        logger.error("Failed to connect to Academic Service", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Academic service unavailable"
        )


# Register the same endpoint on both routers
@router.get("/courses", response_model=list[CourseResponse])
async def list_courses(
    department: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    authorization: Optional[str] = Header(None),
) -> list[CourseResponse]:
    """List courses - alias for _list_courses."""
    return await _list_courses(department, level, semester, skip, limit, authorization)


@courses_router.get("", response_model=list[CourseResponse])
async def list_courses_direct(
    department: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    authorization: Optional[str] = Header(None),
) -> list[CourseResponse]:
    """List courses - direct route at /api/v1/courses."""
    return await _list_courses(department, level, semester, skip, limit, authorization)


@courses_router.post("", status_code=status.HTTP_201_CREATED)
async def create_course_direct(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Create course - direct route at /api/v1/courses."""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization

        json_data = await request.json()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ACADEMIC_SERVICE_URL}/courses",
                headers=headers,
                json=json_data,
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        logger.error("Failed to proxy course creation", error=str(e))
        raise HTTPException(status_code=503, detail="Academic Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error proxying course creation", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@courses_router.put("/{course_id}")
async def update_course_direct(
    course_id: UUID,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Update course - direct route at /api/v1/courses/{course_id}."""
    try:
        headers = {"Content-Type": "application/json"}
        if authorization:
            headers["Authorization"] = authorization

        json_data = await request.json()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{ACADEMIC_SERVICE_URL}/courses/{course_id}",
                headers=headers,
                json=json_data,
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        logger.error("Failed to proxy course update", error=str(e))
        raise HTTPException(status_code=503, detail="Academic Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error proxying course update", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@courses_router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_direct(
    course_id: UUID,
    authorization: Optional[str] = Header(None),
):
    """Delete course - direct route at /api/v1/courses/{course_id}."""
    try:
        headers = {}
        if authorization:
            headers["Authorization"] = authorization

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{ACADEMIC_SERVICE_URL}/courses/{course_id}",
                headers=headers,
            )
            response.raise_for_status()
            return None
    except httpx.RequestError as e:
        logger.error("Failed to proxy course deletion", error=str(e))
        raise HTTPException(status_code=503, detail="Academic Service unavailable")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        logger.error("Unexpected error proxying course deletion", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: UUID) -> CourseResponse:
    """
    Get detailed course information.
    
    Args:
        course_id: Course UUID
        
    Returns:
        CourseResponse: Course details
    """
    logger.info("Get course", course_id=str(course_id))

    # TODO: Call Academic Service
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Course details will be implemented in Academic Service",
    )


@router.post("/sections", status_code=status.HTTP_201_CREATED)
async def create_section(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Proxy section creation to Academic Service."""
    try:
        request_data = await request.json()
        
        headers = {}
        if authorization:
            headers["Authorization"] = authorization
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ACADEMIC_SERVICE_URL}/sections",
                json=request_data,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        logger.error("Section creation failed", status_code=e.response.status_code, detail=e.response.text)
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except httpx.RequestError as e:
        logger.error("Section creation request failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create section")
    except Exception as e:
        logger.error("Unexpected error creating section", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sections", response_model=list[SectionResponse])
async def list_sections(
    course_code: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    instructor_id: Optional[UUID] = Query(None),
    available_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    authorization: Optional[str] = Header(None),
) -> list[SectionResponse]:
    """
    List course sections with filtering.
    
    Args:
        course_code: Filter by course code
        semester: Filter by semester
        instructor_id: Filter by instructor
        available_only: Show only sections with available seats
        skip: Pagination offset
        limit: Page size
        authorization: JWT token
        
    Returns:
        List of sections
    """
    logger.info(
        "List sections",
        course_code=course_code,
        semester=semester,
        available_only=available_only,
    )

    try:
        params = {"skip": skip, "limit": limit, "available_only": available_only}
        if course_code:
            params["course_code"] = course_code
        if semester:
            params["semester"] = semester
        if instructor_id:
            params["instructor_id"] = str(instructor_id)
            
        headers = {}
        if authorization:
            headers["Authorization"] = authorization

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ACADEMIC_SERVICE_URL}/sections",
                params=params,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                try:
                    error_data = response.json()
                    detail = error_data.get("detail", "Failed to fetch sections")
                except:
                    detail = f"Failed to fetch sections: {response.text[:200]}"
                
                logger.error(
                    "Academic Service returned error for sections",
                    status_code=response.status_code,
                    detail=detail,
                    url=f"{ACADEMIC_SERVICE_URL}/sections"
                )
                raise HTTPException(status_code=response.status_code, detail=detail)
                
    except httpx.HTTPStatusError as e:
        # This catches HTTP errors (4xx, 5xx) from the Academic Service
        logger.error(
            "Academic Service HTTP error for sections",
            status_code=e.response.status_code,
            url=f"{ACADEMIC_SERVICE_URL}/sections",
            response_text=e.response.text[:500] if e.response.text else None,
            params=params
        )
        try:
            error_data = e.response.json()
            detail = error_data.get("detail", f"Academic service error: {e.response.status_code}")
        except:
            detail = f"Academic service error: {e.response.status_code} - {e.response.text[:200] if e.response.text else 'No details'}"
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except httpx.RequestError as e:
        # This catches connection errors (network issues, service down)
        logger.error(
            "Failed to connect to Academic Service for sections",
            error=str(e),
            error_type=type(e).__name__,
            url=f"{ACADEMIC_SERVICE_URL}/sections",
            params=params
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Academic service unavailable: {str(e)}"
        )
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(
            "Unexpected error in list_sections",
            error=str(e),
            error_type=type(e).__name__,
            traceback=str(e.__traceback__) if hasattr(e, '__traceback__') else None
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.post("/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_in_section(
    request: EnrollmentRequest,
    authorization: Optional[str] = Header(None),
) -> EnrollmentResponse:
    """
    Enroll a student in a course section.

    Proxies the request to the Academic Service enrollment endpoint,
    which performs full policy validation and enrollment logic.
    """
    logger.info(
        "Proxy enrollment attempt",
        student_id=str(request.student_id),
        section_id=str(request.section_id),
    )

    try:
        payload = {
            "student_id": str(request.student_id),
            "section_id": str(request.section_id),
        }

        headers: dict[str, str] = {}
        if authorization:
            headers["Authorization"] = authorization

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ACADEMIC_SERVICE_URL}/enrollments",
                json=payload,
                headers=headers,
            )

        if response.status_code == 201:
            return response.json()

        # Try to surface a useful error message from Academic Service
        try:
            error_data = response.json()
            # Pass through full error object so frontend can inspect violated_rules, reason, etc.
            detail = error_data if isinstance(error_data, dict) else {"detail": str(error_data)}
        except Exception:
            detail = {"detail": f"Enrollment failed: {response.text[:200]}"}

        logger.error(
            "Academic Service returned error for enrollment",
            status_code=response.status_code,
            detail=detail,
        )
        # Propagate the original status code (e.g., 400 for policy violations)
        raise HTTPException(status_code=response.status_code, detail=detail)

    except httpx.RequestError as e:
        logger.error(
            "Failed to connect to Academic Service for enrollment",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Academic service unavailable, please try again later",
        )
    except HTTPException as e:
        # Re-raise HTTPExceptions so we don't wrap 4xx (e.g., policy violations) as 500
        raise e
    except Exception as e:
        logger.error(
            "Unexpected error in enroll_in_section",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during enrollment: {str(e)}",
        )


@router.delete("/enrollments/{enrollment_id}")
async def drop_enrollment(enrollment_id: UUID) -> dict[str, str]:
    """
    Drop an enrollment.
    
    Args:
        enrollment_id: Enrollment UUID
        
    Returns:
        dict: Confirmation message
    """
    logger.info("Drop enrollment", enrollment_id=str(enrollment_id))

    # TODO: Call Academic Service
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Drop enrollment will be implemented in Academic Service",
    )


@router.get("/enrollments", response_model=list[EnrollmentResponse])
async def get_my_enrollments(
    semester: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
) -> list[EnrollmentResponse]:
    """
    Get current user's enrollments.
    
    Proxies to Academic Service.
    """
    logger.info("Get my enrollments", semester=semester)

    try:
        params = {}
        if semester:
            params["semester"] = semester
            
        headers = {}
        if authorization:
            headers["Authorization"] = authorization

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ACADEMIC_SERVICE_URL}/enrollments",
                params=params,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return []  # No enrollments found
            else:
                try:
                    error_data = response.json()
                    detail = error_data.get("detail", "Failed to fetch enrollments")
                except:
                    detail = f"Failed to fetch enrollments: {response.text[:200]}"
                
                raise HTTPException(status_code=response.status_code, detail=detail)
                
    except httpx.RequestError as e:
        logger.error("Failed to connect to Academic Service", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Academic service unavailable"
        )


"""
Enrollment Service

Core enrollment business logic with policy engine and event sourcing.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from shared.events.store import EventStore
from shared.events.base import Snapshot
from shared.domain.policies import PolicyEngine, PolicyResult
from services.academic_service.aggregates import EnrollmentAggregate
from services.academic_service.models import EnrollmentModel, SectionModel, CourseModel
from services.user_service.models import StudentModel

logger = structlog.get_logger(__name__)


class EnrollmentService:
    """
    Service orchestrating student enrollment with policy enforcement.
    
    Implements:
    - Policy-driven enrollment validation
    - Event-sourced enrollment aggregate
    - Optimistic concurrency control
    - Automatic waitlist management
    """

    def __init__(
        self, db_session: AsyncSession, event_store: EventStore, policy_engine: PolicyEngine
    ):
        """
        Initialize enrollment service.
        
        Args:
            db_session: Database session
            event_store: Event store for event sourcing
            policy_engine: Policy engine for enrollment validation
        """
        self.db = db_session
        self.event_store = event_store
        self.policy_engine = policy_engine

    async def enroll_student(
        self, student_id: UUID, section_id: UUID, user_id: UUID
    ) -> EnrollmentModel:
        """
        Enroll a student in a section with policy validation.
        
        Process:
        1. Fetch student and section data
        2. Build policy evaluation context
        3. Execute all enrollment policies
        4. If allowed, create enrollment or add to waitlist
        5. Emit domain events
        6. Update read model (database)
        
        Args:
            student_id: Student UUID
            section_id: Section UUID
            user_id: User performing enrollment (for audit)
            
        Returns:
            EnrollmentModel: Created enrollment
            
        Raises:
            EnrollmentPolicyViolationError: If policies reject enrollment
            ValueError: If student or section not found
        """
        logger.info(
            "Starting enrollment process",
            student_id=str(student_id),
            section_id=str(section_id),
        )

        # Fetch section with course data
        section = await self._get_section(section_id)
        if section is None:
            raise ValueError(f"Section not found: {section_id}")

        course = await self._get_course(section.course_id)
        if course is None:
            raise ValueError(f"Course not found: {section.course_id}")

        # Fetch student data
        student = await self._get_student(student_id)
        if student is None:
            raise ValueError(f"Student not found: {student_id}")

        # Check for existing enrollment
        existing = await self._check_existing_enrollment(student_id, section_id)
        if existing:
            raise ValueError(f"Student already enrolled in this section")

        # Build policy evaluation context
        context = await self._build_policy_context(student_id, section_id, student, section, course)

        # Evaluate all policies
        allowed, policy_results = await self.policy_engine.evaluate_all(
            student_id, section_id, context
        )

        if not allowed:
            # Find first failed policy
            failed_result = next((r for r in policy_results if not r.allowed), None)
            logger.warning(
                "Enrollment denied by policy",
                student_id=str(student_id),
                section_id=str(section_id),
                reason=failed_result.reason if failed_result else "Unknown",
            )
            raise EnrollmentPolicyViolationError(
                reason=failed_result.reason if failed_result else "Policy violation",
                violated_rules=failed_result.violated_rules if failed_result else [],
            )

        # Policies passed - proceed with enrollment
        logger.info(
            "Policies passed, proceeding with enrollment",
            student_id=str(student_id),
            section_id=str(section_id),
        )

        # Create enrollment aggregate
        enrollment_id = uuid4()
        aggregate = EnrollmentAggregate(enrollment_id)

        # Determine if direct enrollment or waitlist
        if section.current_enrollment < section.max_enrollment:
            # Direct enrollment
            aggregate.enroll_student(
                student_id=student_id,
                section_id=section_id,
                course_code=course.course_code,
                user_id=user_id,
            )

            # Update section capacity
            section.current_enrollment += 1

        else:
            # Add to waitlist
            if section.waitlist_size >= section.max_waitlist:
                raise ValueError("Section and waitlist are both full")

            waitlist_position = section.waitlist_size + 1
            aggregate.add_to_waitlist(
                student_id=student_id,
                section_id=section_id,
                position=waitlist_position,
                user_id=user_id,
            )

            # Update waitlist size
            section.waitlist_size += 1

        # Persist events to event store
        stream_id = f"enrollment-{enrollment_id}"
        for event in aggregate.get_uncommitted_events():
            await self.event_store.append(
                event=event, stream_id=stream_id, expected_version=None
            )

        aggregate.mark_events_committed()

        # Create snapshot (optional, for performance)
        snapshot = Snapshot(
            aggregate_id=enrollment_id,
            aggregate_type=aggregate.aggregate_type(),
            state=aggregate.get_state(),
            version=aggregate.version,
            event_count=aggregate.version,
        )
        await self.event_store.save_snapshot(snapshot)

        # Update read model (database) for query performance
        enrollment = EnrollmentModel(
            id=enrollment_id,
            student_id=student_id,
            section_id=section_id,
            enrollment_status="waitlisted" if aggregate.is_waitlisted else "enrolled",
            is_waitlisted=aggregate.is_waitlisted,
            waitlist_position=aggregate.waitlist_position,
            enrolled_at=aggregate.enrolled_at or datetime.utcnow(),
        )

        self.db.add(enrollment)
        await self.db.flush()

        logger.info(
            "Enrollment completed",
            enrollment_id=str(enrollment_id),
            student_id=str(student_id),
            section_id=str(section_id),
            status=enrollment.enrollment_status,
        )

        return enrollment

    async def _get_section(self, section_id: UUID) -> Optional[SectionModel]:
        """Fetch section from database."""
        result = await self.db.execute(select(SectionModel).where(SectionModel.id == section_id))
        return result.scalar_one_or_none()

    async def _get_course(self, course_id: UUID) -> Optional[CourseModel]:
        """Fetch course from database."""
        result = await self.db.execute(select(CourseModel).where(CourseModel.id == course_id))
        return result.scalar_one_or_none()

    async def _get_student(self, student_id: UUID) -> Optional[StudentModel]:
        """Fetch student from database."""
        # Note: This requires importing from user_service
        # In microservices, this would be an RPC call
        from services.user_service.models import StudentModel as UserStudentModel

        result = await self.db.execute(
            select(UserStudentModel).where(UserStudentModel.user_id == student_id)
        )
        return result.scalar_one_or_none()

    async def _check_existing_enrollment(
        self, student_id: UUID, section_id: UUID
    ) -> Optional[EnrollmentModel]:
        """Check if enrollment already exists."""
        result = await self.db.execute(
            select(EnrollmentModel).where(
                EnrollmentModel.student_id == student_id,
                EnrollmentModel.section_id == section_id,
                EnrollmentModel.enrollment_status.in_(["enrolled", "waitlisted"]),
            )
        )
        return result.scalar_one_or_none()

    async def _build_policy_context(
        self,
        student_id: UUID,
        section_id: UUID,
        student: Any,
        section: SectionModel,
        course: CourseModel,
    ) -> dict[str, Any]:
        """
        Build context for policy evaluation.
        
        Gathers all necessary data for policy decisions.
        """
        # Get student's completed courses
        completed_courses = await self._get_completed_courses(student_id)

        # Get student's current enrollments for schedule conflict check
        current_enrollments = await self._get_current_enrollments(student_id, section.semester)

        # Build schedule for current section
        section_schedule = {
            "days": section.schedule_days,
            "start_time": section.start_time,
            "end_time": section.end_time,
        }

        # Build context
        context = {
            # Course data
            "course_prerequisites": course.prerequisites,
            "course_credits": course.credits,
            "course_code": course.course_code,
            # Section data
            "section_max_enrollment": section.max_enrollment,
            "section_current_enrollment": section.current_enrollment,
            "section_schedule": section_schedule,
            # Student data
            "student_completed_courses": completed_courses,
            "student_current_credits": await self._calculate_current_credits(
                student_id, section.semester
            ),
            "student_gpa": student.gpa if student else 0.0,
            "student_academic_standing": student.academic_standing if student else "good",
            "student_current_schedule": current_enrollments,
            # Temporal data
            "current_time": datetime.utcnow(),
        }

        return context

    async def _get_completed_courses(self, student_id: UUID) -> list[str]:
        """Get list of course codes the student has completed."""
        result = await self.db.execute(
            select(CourseModel.course_code)
            .join(SectionModel, SectionModel.course_id == CourseModel.id)
            .join(
                EnrollmentModel,
                EnrollmentModel.section_id == SectionModel.id,
            )
            .where(
                EnrollmentModel.student_id == student_id,
                EnrollmentModel.enrollment_status == "completed",
            )
        )
        return [row[0] for row in result.all()]

    async def _get_current_enrollments(
        self, student_id: UUID, semester: str
    ) -> list[dict[str, Any]]:
        """Get student's current enrollments for schedule conflict checking."""
        result = await self.db.execute(
            select(SectionModel, CourseModel)
            .join(CourseModel, SectionModel.course_id == CourseModel.id)
            .join(EnrollmentModel, EnrollmentModel.section_id == SectionModel.id)
            .where(
                EnrollmentModel.student_id == student_id,
                SectionModel.semester == semester,
                EnrollmentModel.enrollment_status == "enrolled",
            )
        )

        enrollments = []
        for section, course in result.all():
            enrollments.append({
                "section_id": str(section.id),
                "course_code": course.course_code,
                "days": section.schedule_days,
                "start_time": section.start_time,
                "end_time": section.end_time,
            })

        return enrollments

    async def _calculate_current_credits(self, student_id: UUID, semester: str) -> int:
        """Calculate total credits student is currently enrolled in."""
        result = await self.db.execute(
            select(CourseModel.credits)
            .join(SectionModel, SectionModel.course_id == CourseModel.id)
            .join(EnrollmentModel, EnrollmentModel.section_id == SectionModel.id)
            .where(
                EnrollmentModel.student_id == student_id,
                SectionModel.semester == semester,
                EnrollmentModel.enrollment_status == "enrolled",
            )
        )

        return sum(row[0] for row in result.all())


class EnrollmentPolicyViolationError(Exception):
    """Raised when enrollment policies are violated."""

    def __init__(self, reason: str, violated_rules: list[str]):
        """
        Initialize policy violation error.
        
        Args:
            reason: Human-readable reason
            violated_rules: List of violated rule identifiers
        """
        super().__init__(reason)
        self.reason = reason
        self.violated_rules = violated_rules


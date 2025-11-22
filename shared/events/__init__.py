"""
Event Sourcing Infrastructure

Core event definitions and event store for CQRS pattern implementation.
"""

from shared.events.base import Event, DomainEvent, EventMetadata
from shared.events.academic_events import (
    CourseCreatedEvent,
    SectionCreatedEvent,
    StudentEnrolledEvent,
    StudentWaitlistedEvent,
    GradeAssignedEvent,
)
from shared.events.security_events import (
    UserAuthenticatedEvent,
    AccessGrantedEvent,
    AccessDeniedEvent,
    SecurityIncidentEvent,
)

__all__ = [
    "Event",
    "DomainEvent",
    "EventMetadata",
    "CourseCreatedEvent",
    "SectionCreatedEvent",
    "StudentEnrolledEvent",
    "StudentWaitlistedEvent",
    "GradeAssignedEvent",
    "UserAuthenticatedEvent",
    "AccessGrantedEvent",
    "AccessDeniedEvent",
    "SecurityIncidentEvent",
]


"""
Argos Domain Models

Core domain entities and value objects following Domain-Driven Design principles.
Implements deep inheritance hierarchy with 5+ levels as required by the assignment.

Composition Relationships:
- Person has-a Credential (authentication)
- Course contains Section (aggregation)
- Section uses-a Room (association)
- Facility contains Room (composition)
- Room has-a Resource (composition)
- Room has-a Sensor/Actuator (composition)
- Timetable contains Constraint (composition)
- Timetable creates TimetableSnapshot (aggregation)
- EventStream uses Event (association)
"""

from shared.domain.entities import (
    AbstractEntity,
    VersionedEntity,
    AuditableEntity,
    Person,
    Student,
    Lecturer,
    Staff,
    Guest,
    Admin,
)
from shared.domain.academic import Course, Section, Syllabus, Assessment, Grade
from shared.domain.facilities import Facility, Room, Resource, Sensor, Actuator, Booking
from shared.domain.security import (
    Credential,
    PasswordCredential,
    OAuthCredential,
    CertificateCredential,
    AuthToken,
    Role,
    Permission,
)
from shared.domain.scheduler import (
    Constraint,
    CapacityConstraint,
    TimeConflictConstraint,
    InstructorAvailabilityConstraint,
    RoomPreferenceConstraint,
    BalancedWorkloadConstraint,
    Timetable,
    TimetableSnapshot,
)

__all__ = [
    # Base Entities
    "AbstractEntity",
    "VersionedEntity",
    "AuditableEntity",
    # People
    "Person",
    "Student",
    "Lecturer",
    "Staff",
    "Guest",
    "Admin",
    # Academic
    "Course",
    "Section",
    "Syllabus",
    "Assessment",
    "Grade",
    # Facilities
    "Facility",
    "Room",
    "Resource",
    "Sensor",
    "Actuator",
    "Booking",
    # Security
    "Credential",
    "PasswordCredential",
    "OAuthCredential",
    "CertificateCredential",
    "AuthToken",
    "Role",
    "Permission",
    # Scheduler
    "Constraint",
    "CapacityConstraint",
    "TimeConflictConstraint",
    "InstructorAvailabilityConstraint",
    "RoomPreferenceConstraint",
    "BalancedWorkloadConstraint",
    "Timetable",
    "TimetableSnapshot",
]


"""
Argos Domain Models

Core domain entities and value objects following Domain-Driven Design principles.
Implements deep inheritance hierarchy with 5+ levels as required by the assignment.
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
from shared.domain.facilities import Facility, Room, Resource, Sensor, Actuator
from shared.domain.security import Credential, AuthToken, Role, Permission

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
    # Security
    "Credential",
    "AuthToken",
    "Role",
    "Permission",
]


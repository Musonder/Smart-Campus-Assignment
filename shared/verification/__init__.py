"""
Formal Verification Module

Provides runtime verification of critical system invariants.
"""

from shared.verification.enrollment_invariants import (
    InvariantMonitor,
    get_invariant_monitor,
    assert_enrollment_invariant,
    Section,
    TimeSlot,
    Enrollment,
    InvariantViolationType,
)

__all__ = [
    'InvariantMonitor',
    'get_invariant_monitor',
    'assert_enrollment_invariant',
    'Section',
    'TimeSlot',
    'Enrollment',
    'InvariantViolationType',
]


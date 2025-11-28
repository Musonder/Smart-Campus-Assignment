"""
Unit tests for enrollment policies and invariant enforcement.
"""

import asyncio
from uuid import uuid4

import pytest

from shared.domain.policies import (
    PolicyResult,
    PrerequisitePolicy,
    CapacityPolicy,
    TimeConflictPolicy,
    CreditLimitPolicy,
)


@pytest.mark.asyncio
async def test_prerequisite_policy_allows_when_completed():
  policy = PrerequisitePolicy()
  student_id = uuid4()
  section_id = uuid4()

  context = {
      "course_prerequisites": ["CS-101", "MATH-100"],
      "student_completed_courses": ["CS-101", "MATH-100", "ENG-101"],
  }

  result: PolicyResult = await policy.evaluate(student_id, section_id, context)
  assert result.allowed is True
  assert result.violated_rules == []


@pytest.mark.asyncio
async def test_prerequisite_policy_blocks_missing_course():
  policy = PrerequisitePolicy()
  student_id = uuid4()
  section_id = uuid4()

  context = {
      "course_prerequisites": ["CS-101", "MATH-100"],
      "student_completed_courses": ["CS-101"],
  }

  result: PolicyResult = await policy.evaluate(student_id, section_id, context)
  assert result.allowed is False
  assert "prerequisite_requirement" in result.violated_rules
  assert "MATH-100" in result.metadata.get("missing_prerequisites", [])


@pytest.mark.asyncio
async def test_capacity_policy_blocks_full_section():
  policy = CapacityPolicy()
  student_id = uuid4()
  section_id = uuid4()

  context = {
      "section_max_enrollment": 30,
      "section_current_enrollment": 30,
  }

  result: PolicyResult = await policy.evaluate(student_id, section_id, context)
  assert result.allowed is False
  assert "capacity_limit" in result.violated_rules


@pytest.mark.asyncio
async def test_time_conflict_policy_detects_overlap():
  policy = TimeConflictPolicy()
  student_id = uuid4()
  section_id = uuid4()

  context = {
      "section_schedule": {
          "days": ["Monday", "Wednesday"],
          "start_time": "10:00",
          "end_time": "11:00",
      },
      "student_current_schedule": [
          {
              "section_id": str(uuid4()),
              "course_code": "CS-101",
              "days": ["Monday"],
              "start_time": "10:30",
              "end_time": "12:00",
          }
      ],
  }

  result: PolicyResult = await policy.evaluate(student_id, section_id, context)
  assert result.allowed is False
  assert "no_time_conflict" in result.violated_rules


@pytest.mark.asyncio
async def test_time_conflict_policy_allows_non_overlapping():
  policy = TimeConflictPolicy()
  student_id = uuid4()
  section_id = uuid4()

  context = {
      "section_schedule": {
          "days": ["Tuesday"],
          "start_time": "09:00",
          "end_time": "10:00",
      },
      "student_current_schedule": [
          {
              "section_id": str(uuid4()),
              "course_code": "CS-101",
              "days": ["Monday"],
              "start_time": "10:30",
              "end_time": "12:00",
          }
      ],
  }

  result: PolicyResult = await policy.evaluate(student_id, section_id, context)
  assert result.allowed is True
  assert result.violated_rules == []


@pytest.mark.asyncio
async def test_credit_limit_policy_blocks_overload():
  policy = CreditLimitPolicy(max_credits=18)
  student_id = uuid4()
  section_id = uuid4()

  context = {
      "course_credits": 4,
      "student_current_credits": 16,
  }

  result: PolicyResult = await policy.evaluate(student_id, section_id, context)
  assert result.allowed is False
  assert "credit_limit" in result.violated_rules



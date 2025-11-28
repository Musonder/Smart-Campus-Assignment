"""
Tests for Analytics Service ML endpoints, focusing on graceful fallback behavior.
"""

import pytest
from httpx import AsyncClient

from services.analytics_service.main import app as analytics_app


@pytest.mark.asyncio
async def test_predict_enrollment_fallback_rule_based():
  """
  Even when real ML packages or models are unavailable, the endpoint must return
  a well-formed prediction response using the rule-based fallback.
  """
  async with AsyncClient(app=analytics_app, base_url="http://test") as client:
    payload = {
      "student_id": "test-student",
      "gpa": 3.0,
      "credits_enrolled": 15,
      "attendance_rate": 90.0,
      "engagement_score": 0.8,
      "previous_dropout_risk": 0.1,
      "course_difficulty": 0.5,
      "study_hours": 15.0,
      "num_failed_courses": 0,
      "explain": True,
    }
    resp = await client.post("/api/v1/predict/enrollment", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "dropout_probability" in data
    assert 0.0 <= data["dropout_probability"] <= 1.0
    assert data["student_id"] == "test-student"



"""
Enrollment Stress Test Harness

Simulates many concurrent clients performing enrollment operations via the
API Gateway to validate invariants and concurrency behavior.

Usage (from project root, with services running):

  python -m scripts.enrollment_stress_test
"""

import asyncio
import os
from typing import Any
from uuid import UUID

import httpx

API_BASE = os.getenv("STRESS_API_BASE", "http://localhost:8000")


async def enroll_once(client: httpx.AsyncClient, token: str, student_id: str, section_id: str) -> tuple[int, Any]:
  headers = {"Authorization": f"Bearer {token}"}
  payload = {"student_id": student_id, "section_id": section_id}
  resp = await client.post(f"{API_BASE}/api/v1/academic/enrollments", json=payload, headers=headers)
  return resp.status_code, resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text


async def stress_test_enrollments(
    token: str,
    student_id: str,
    section_id: str,
    num_clients: int = 50,
    attempts_per_client: int = 20,
) -> None:
  async with httpx.AsyncClient(timeout=10.0) as client:
    tasks = []
    for _ in range(num_clients):
      for _ in range(attempts_per_client):
        tasks.append(enroll_once(client, token, student_id, section_id))

    results = await asyncio.gather(*tasks, return_exceptions=True)

  success = sum(1 for r in results if not isinstance(r, Exception) and r[0] == 201)
  conflicts = sum(
      1
      for r in results
      if not isinstance(r, Exception)
      and isinstance(r[1], dict)
      and "violated_rules" in r[1].get("detail", {})
  )
  errors = [r for r in results if isinstance(r, Exception) or (not isinstance(r, Exception) and r[0] >= 500)]

  print(f"Total attempts: {len(results)}")
  print(f"Successful enrollments (201): {success}")
  print(f"Policy conflicts (e.g. capacity/time): {conflicts}")
  print(f"Server errors (>=500 or exceptions): {len(errors)}")


if __name__ == "__main__":
  # These IDs must be supplied via environment variables or hardcoded for your test dataset.
  token = os.getenv("STRESS_ACCESS_TOKEN")
  student_id = os.getenv("STRESS_STUDENT_ID")
  section_id = os.getenv("STRESS_SECTION_ID")

  if not token or not student_id or not section_id:
    print("Please set STRESS_ACCESS_TOKEN, STRESS_STUDENT_ID, and STRESS_SECTION_ID env vars before running.")
  else:
    asyncio.run(stress_test_enrollments(token, student_id, section_id))



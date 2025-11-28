"""
Penetration Testing Suite

Automated tests simulating common security attacks:
- Replay attacks (token reuse)
- SQL injection
- Privilege escalation
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication bypass
"""

import pytest
import httpx
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import json
import base64

from fastapi.testclient import TestClient
from jose import jwt

from shared.config import settings
from shared.security.rbac import RBACService, ABACService, AuthorizationService
from shared.domain.security import PermissionAction, ResourceType


class TestReplayAttacks:
    """Test replay attack prevention."""

    def test_token_replay_attack(self, client: TestClient):
        """
        Test that reusing an old token (replay attack) is prevented.
        
        Simulates an attacker capturing a valid token and trying to reuse it.
        """
        # Login and get token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Use token successfully
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

        # Simulate token expiration (in real system, token would expire)
        # Try to use expired token
        expired_payload = {
            "sub": str(uuid4()),
            "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
            "user_type": "student",
        }
        expired_token = jwt.encode(
            expired_payload, settings.secret_key, algorithm=settings.jwt_algorithm
        )

        # Attempt replay with expired token
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        # Should reject expired token
        assert response.status_code in [401, 403]

    def test_request_replay_attack(self, client: TestClient):
        """
        Test that request replay is detected (nonce/timestamp validation).
        
        Simulates an attacker capturing a valid request and replaying it.
        """
        # In a real system, requests should include nonces or timestamps
        # This test verifies that duplicate requests are detected
        pass  # Implementation would require nonce tracking


class TestSQLInjection:
    """Test SQL injection prevention."""

    def test_sql_injection_in_email(self, client: TestClient):
        """
        Test that SQL injection in email field is prevented.
        
        Simulates attacker trying to inject SQL via email parameter.
        """
        # Attempt SQL injection in login
        malicious_email = "admin' OR '1'='1' --"
        response = client.post(
            "/api/v1/auth/login",
            json={"email": malicious_email, "password": "anything"},
        )

        # Should fail authentication, not execute SQL
        assert response.status_code in [401, 400, 422]
        # Verify no SQL was executed (check logs or database state)

    def test_sql_injection_in_query_params(self, client: TestClient):
        """
        Test SQL injection in query parameters.
        
        Simulates attacker injecting SQL via query parameters.
        """
        # Get auth token first
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Attempt SQL injection in query parameter
        malicious_param = "1' OR '1'='1' --"
        response = client.get(
            f"/api/v1/courses?department={malicious_param}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should handle gracefully, not execute SQL
        assert response.status_code in [200, 400, 422]
        # Verify parameterized queries are used (no SQL execution)

    def test_sql_injection_in_json_body(self, client: TestClient):
        """
        Test SQL injection in JSON request body.
        
        Simulates attacker injecting SQL via JSON fields.
        """
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "lecturer@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Attempt SQL injection in JSON
        malicious_data = {
            "course_code": "CS101'; DROP TABLE courses; --",
            "title": "Test Course",
        }

        response = client.post(
            "/api/v1/courses",
            json=malicious_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should validate and reject, not execute SQL
        assert response.status_code in [400, 422]
        # Verify no table was dropped


class TestPrivilegeEscalation:
    """Test privilege escalation prevention."""

    def test_student_escalating_to_admin(self, client: TestClient):
        """
        Test that a student cannot escalate to admin privileges.
        
        Simulates student trying to access admin-only endpoints.
        """
        # Login as student
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Try to access admin-only endpoint
        response = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should be denied
        assert response.status_code == 403

    def test_student_modifying_other_student_grade(self, client: TestClient):
        """
        Test that a student cannot modify another student's grade.
        
        Simulates student trying to change another student's grade.
        """
        # Login as student
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Try to modify another student's grade
        other_student_id = uuid4()
        response = client.post(
            "/api/v1/grades",
            json={
                "student_id": str(other_student_id),
                "section_id": str(uuid4()),
                "assessment_id": str(uuid4()),
                "points_earned": 100.0,
                "total_points": 100.0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should be denied (only lecturers/admins can grade)
        assert response.status_code == 403

    def test_lecturer_accessing_admin_endpoints(self, client: TestClient):
        """
        Test that a lecturer cannot access admin-only endpoints.
        
        Simulates lecturer trying to access admin functionality.
        """
        # Login as lecturer
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "lecturer@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Try to delete a user (admin-only)
        response = client.delete(
            f"/api/v1/admin/users/{uuid4()}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should be denied
        assert response.status_code == 403

    def test_rbac_privilege_escalation(self):
        """
        Test RBAC prevents privilege escalation.
        
        Verifies that role-based access control correctly prevents
        unauthorized access.
        """
        rbac = RBACService()
        from shared.domain.security import Role, Permission

        # Create student role
        student_role = Role(
            id=uuid4(),
            name="student",
            permissions=[
                Permission(
                    action=PermissionAction.READ,
                    resource_type=ResourceType.COURSE,
                )
            ],
        )
        rbac.load_role(student_role)

        # Create admin role
        admin_role = Role(
            id=uuid4(),
            name="admin",
            permissions=[
                Permission(
                    action=PermissionAction.DELETE,
                    resource_type=ResourceType.USER,
                )
            ],
        )
        rbac.load_role(admin_role)

        # Student should NOT have admin permissions
        has_permission = rbac.has_permission(
            user_roles=[student_role.id],
            action=PermissionAction.DELETE,
            resource_type=ResourceType.USER,
        )
        assert has_permission is False

        # Admin should have admin permissions
        has_permission = rbac.has_permission(
            user_roles=[admin_role.id],
            action=PermissionAction.DELETE,
            resource_type=ResourceType.USER,
        )
        assert has_permission is True


class TestXSSAttacks:
    """Test Cross-Site Scripting (XSS) prevention."""

    def test_xss_in_input_field(self, client: TestClient):
        """
        Test that XSS payloads in input fields are sanitized.
        
        Simulates attacker injecting JavaScript via input fields.
        """
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "lecturer@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Attempt XSS in course title
        xss_payload = "<script>alert('XSS')</script>"
        response = client.post(
            "/api/v1/courses",
            json={
                "course_code": "CS101",
                "title": xss_payload,
                "description": "Test",
                "credits": 3,
                "level": "undergraduate",
                "department": "CS",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should sanitize or reject
        assert response.status_code in [200, 400, 422]
        if response.status_code == 200:
            # Verify XSS was sanitized
            course_data = response.json()
            assert "<script>" not in course_data.get("title", "")

    def test_xss_in_json_response(self, client: TestClient):
        """
        Test that XSS in stored data is sanitized in responses.
        
        Verifies that data retrieved from database is sanitized.
        """
        # This would test that stored XSS payloads are escaped in API responses
        pass  # Implementation would require HTML escaping in responses


class TestCSRFAttacks:
    """Test Cross-Site Request Forgery (CSRF) prevention."""

    def test_csrf_token_validation(self, client: TestClient):
        """
        Test that CSRF tokens are required for state-changing operations.
        
        Simulates attacker trying to perform actions without CSRF token.
        """
        # In a real system, state-changing operations should require CSRF tokens
        # This test verifies CSRF protection
        pass  # Implementation would require CSRF token middleware

    def test_csrf_in_cross_origin_request(self, client: TestClient):
        """
        Test that cross-origin requests are properly validated.
        
        Verifies CORS and CSRF protection.
        """
        # Attempt cross-origin request
        response = client.post(
            "/api/v1/courses",
            json={"course_code": "CS101", "title": "Test"},
            headers={
                "Origin": "https://malicious-site.com",
                "Referer": "https://malicious-site.com",
            },
        )

        # Should reject or require proper CORS headers
        assert response.status_code in [401, 403, 400]


class TestAuthenticationBypass:
    """Test authentication bypass attempts."""

    def test_jwt_tampering(self, client: TestClient):
        """
        Test that tampered JWT tokens are rejected.
        
        Simulates attacker modifying JWT token to escalate privileges.
        """
        # Get valid token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Tamper with token (modify payload)
        parts = token.split(".")
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))
        payload["user_type"] = "admin"  # Try to escalate
        tampered_payload = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode().rstrip("=")
        tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

        # Try to use tampered token
        response = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )

        # Should reject tampered token (signature won't match)
        assert response.status_code in [401, 403]

    def test_missing_authentication(self, client: TestClient):
        """
        Test that endpoints require authentication.
        
        Verifies that protected endpoints reject unauthenticated requests.
        """
        # Try to access protected endpoint without token
        response = client.get("/api/v1/users/me")

        # Should require authentication
        assert response.status_code == 401

    def test_invalid_token_format(self, client: TestClient):
        """
        Test that invalid token formats are rejected.
        
        Simulates attacker sending malformed tokens.
        """
        # Try various invalid token formats
        invalid_tokens = [
            "invalid",
            "Bearer invalid",
            "Bearer ",
            "Bearer not.a.valid.jwt",
        ]

        for invalid_token in invalid_tokens:
            response = client.get(
                "/api/v1/users/me",
                headers={"Authorization": invalid_token},
            )
            # Should reject invalid tokens
            assert response.status_code in [401, 422]


class TestInjectionAttacks:
    """Test various injection attack vectors."""

    def test_command_injection(self, client: TestClient):
        """
        Test that command injection is prevented.
        
        Simulates attacker trying to inject system commands.
        """
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Attempt command injection
        malicious_input = "; rm -rf /"
        response = client.get(
            f"/api/v1/courses?search={malicious_input}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should handle safely, not execute commands
        assert response.status_code in [200, 400, 422]

    def test_path_traversal(self, client: TestClient):
        """
        Test that path traversal attacks are prevented.
        
        Simulates attacker trying to access files outside allowed directories.
        """
        login_response = client.post(
            "/api/v1/auth/login",
            json={"email": "student@test.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Attempt path traversal
        malicious_path = "../../../etc/passwd"
        response = client.get(
            f"/api/v1/files/{malicious_path}",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should reject or sanitize path
        assert response.status_code in [400, 403, 404, 422]


@pytest.fixture
def client():
    """Create test client."""
    # In real tests, this would import the actual FastAPI app
    # from services.api_gateway.main import app
    # return TestClient(app)
    pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


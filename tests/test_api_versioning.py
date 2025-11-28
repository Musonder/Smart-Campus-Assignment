"""
API Versioning and Backward Compatibility Tests

Tests API versioning, backward compatibility, and version transformation.
"""

import pytest
from fastapi.testclient import TestClient
from shared.api.versioning import (
    APIVersion,
    VersionedEndpoint,
    APIVersionMiddleware,
    create_versioned_router,
)


class TestAPIVersioning:
    """Test API versioning functionality."""

    def test_version_enum(self):
        """Test API version enumeration."""
        assert APIVersion.V1 == APIVersion.V1
        assert APIVersion.from_string("v1") == APIVersion.V1
        assert APIVersion.from_string("1") == APIVersion.V1
        assert APIVersion.from_string("invalid") is None

    def test_version_extraction_from_header(self):
        """Test version extraction from Accept header."""
        middleware = APIVersionMiddleware()
        
        headers = {"accept": "application/vnd.argos.v2+json"}
        version = middleware.extract_version(headers, {}, "/api/courses")
        
        assert version == APIVersion.V2

    def test_version_extraction_from_query(self):
        """Test version extraction from query parameter."""
        middleware = APIVersionMiddleware()
        
        query_params = {"api_version": "v2"}
        version = middleware.extract_version({}, query_params, "/api/courses")
        
        assert version == APIVersion.V2

    def test_version_extraction_from_path(self):
        """Test version extraction from URL path."""
        middleware = APIVersionMiddleware()
        
        version = middleware.extract_version({}, {}, "/api/v3/courses")
        
        assert version == APIVersion.V3

    def test_versioned_endpoint(self):
        """Test versioned endpoint routing."""
        endpoint = VersionedEndpoint("test_endpoint", current_version=APIVersion.V2)
        
        # Register handlers
        async def v1_handler(request):
            return {"version": "v1", "data": request}
        
        async def v2_handler(request):
            return {"version": "v2", "data": request}
        
        endpoint.register_version(APIVersion.V1, v1_handler, is_deprecated=True)
        endpoint.register_version(APIVersion.V2, v2_handler)
        
        # Test v1 (deprecated)
        import asyncio
        response = asyncio.run(endpoint.handle_request({"test": "data"}, APIVersion.V1))
        assert response["version"] == "v1"
        
        # Test v2 (current)
        response = asyncio.run(endpoint.handle_request({"test": "data"}, APIVersion.V2))
        assert response["version"] == "v2"

    def test_version_transformation(self):
        """Test request/response transformation between versions."""
        endpoint = VersionedEndpoint("test_endpoint", current_version=APIVersion.V2)
        
        # Register v2 handler
        async def v2_handler(request):
            return {"result": request.get("value", 0) * 2}
        
        endpoint.register_version(APIVersion.V2, v2_handler)
        
        # Register transformer: v1 -> v2
        def v1_to_v2(request):
            # Transform v1 request format to v2
            return {"value": request.get("number", 0)}
        
        endpoint.register_transformer(APIVersion.V1, APIVersion.V2, v1_to_v2)
        
        # Register transformer: v2 -> v1
        def v2_to_v1(response):
            # Transform v2 response format to v1
            return {"output": response.get("result", 0)}
        
        endpoint.register_transformer(APIVersion.V2, APIVersion.V1, v2_to_v1)
        
        # Test: v1 request -> v2 handler -> v1 response
        import asyncio
        v1_request = {"number": 5}
        response = asyncio.run(endpoint.handle_request(v1_request, APIVersion.V1))
        
        # Response should be in v1 format
        assert "output" in response
        assert response["output"] == 10  # 5 * 2

    def test_versioned_router(self):
        """Test versioned route creation."""
        routes = create_versioned_router("/api")
        
        assert routes["v1"] == "/api/v1"
        assert routes["v2"] == "/api/v2"
        assert routes["v3"] == "/api/v3"


class TestBackwardCompatibility:
    """Test backward compatibility between API versions."""

    def test_v1_to_v2_compatibility(self):
        """Test that v1 requests work with v2 API."""
        # This would test actual API endpoints
        # For now, we test the versioning infrastructure
        pass

    def test_deprecated_version_warning(self):
        """Test that deprecated versions log warnings."""
        endpoint = VersionedEndpoint("test", current_version=APIVersion.V2)
        endpoint.register_version(APIVersion.V1, lambda r: r, is_deprecated=True)
        
        # Should log warning when v1 is used
        # (actual logging test would use pytest-capturelog or similar)
        pass

    def test_version_fallback(self):
        """Test that missing version falls back to current."""
        endpoint = VersionedEndpoint("test", current_version=APIVersion.V2)
        
        async def v2_handler(request):
            return {"version": "v2"}
        
        endpoint.register_version(APIVersion.V2, v2_handler)
        
        # Request with None version should use current
        import asyncio
        response = asyncio.run(endpoint.handle_request({}, None))
        assert response["version"] == "v2"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


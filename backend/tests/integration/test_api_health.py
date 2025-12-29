"""Integration tests for health check endpoint."""

import pytest
from fastapi.testclient import TestClient


class TestHealthCheck:
    """Tests for health check endpoint."""

    @pytest.mark.smoke
    def test_health_check_returns_ok(self, client: TestClient) -> None:
        """GET /health should return 200 OK."""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

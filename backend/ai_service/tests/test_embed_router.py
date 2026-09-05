"""
Embedding Router Tests.
Tests the /embed endpoint with mocked sentence-transformers model.
"""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock


class TestEmbedEndpoint:
    @patch("embed_router.model")
    def test_returns_vector(self, mock_model):
        """POST /embed with valid text → returns embedding vector."""
        fake_vector = np.array([0.1, 0.2, 0.3, 0.4, 0.5], dtype=np.float32)
        mock_model.encode.return_value = fake_vector

        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/embed", json={"text": "Hello world"})

        assert response.status_code == 200
        data = response.json()
        assert "embedding" in data
        assert isinstance(data["embedding"], list)
        assert len(data["embedding"]) == 5
        assert abs(data["embedding"][0] - 0.1) < 0.01

    def test_model_not_loaded_returns_500(self):
        """When embedding model is None → 500."""
        with patch("embed_router.model", None):
            with patch("router.rate_limiter.redis.Redis"):
                from fastapi.testclient import TestClient
                from main import app
                client = TestClient(app)

                response = client.post("/embed", json={"text": "Hello"})

        assert response.status_code == 500
        assert "not loaded" in response.json()["detail"].lower()

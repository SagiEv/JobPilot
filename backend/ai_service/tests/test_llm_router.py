"""
LLM Router & Rate Limiter Tests.
Tests provider routing, API key validation, rate limiting, and Redis failure handling.
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException


# ── LLM Router ───────────────────────────────────────────────────────────────

class TestLLMRouter:
    @patch("router.llm_router.rate_limiter")
    def test_unsupported_provider_raises_400(self, mock_limiter):
        mock_limiter.is_limited.return_value = False

        from router.llm_router import LLMRouter

        with pytest.raises(HTTPException) as exc_info:
            LLMRouter.get_model(
                provider="nonexistent_provider",
                model=None,
                api_keys={"nonexistent_provider_token": "key"},
            )
        assert exc_info.value.status_code == 400
        assert "Unsupported" in str(exc_info.value.detail)

    @patch("router.llm_router.rate_limiter")
    def test_missing_api_key_raises_400(self, mock_limiter):
        mock_limiter.is_limited.return_value = False

        from router.llm_router import LLMRouter

        with pytest.raises(HTTPException) as exc_info:
            LLMRouter.get_model(
                provider="groq",
                model=None,
                api_keys={},  # No groq_token
            )
        assert exc_info.value.status_code == 400
        assert "API key" in str(exc_info.value.detail)

    @patch("router.llm_router.rate_limiter")
    def test_rate_limited_raises_429(self, mock_limiter):
        mock_limiter.is_limited.return_value = True
        mock_limiter.get_alternative_provider.return_value = "openai"

        from router.llm_router import LLMRouter

        with pytest.raises(HTTPException) as exc_info:
            LLMRouter.get_model(
                provider="groq",
                model=None,
                api_keys={"groq_token": "key"},
            )
        assert exc_info.value.status_code == 429
        assert exc_info.value.detail["suggested_model"] == "openai"


# ── Rate Limiter ─────────────────────────────────────────────────────────────

class TestRateLimiter:
    def test_fail_open_on_redis_down(self):
        """Redis ConnectionError → is_limited() returns False (fail open)."""
        import redis as redis_lib

        mock_redis = MagicMock()
        mock_redis.exists.side_effect = redis_lib.ConnectionError("Connection refused")
        mock_redis.get.side_effect = redis_lib.ConnectionError("Connection refused")

        from router.rate_limiter import RateLimiter
        limiter = RateLimiter.__new__(RateLimiter)
        limiter.redis_client = mock_redis
        limiter.limits = {"groq": {"rpm": 30}}

        assert limiter.is_limited("groq") is False

    def test_get_alternative_provider(self):
        """Finds an unlisted provider when current is limited."""
        from router.rate_limiter import RateLimiter

        mock_redis = MagicMock()
        # First provider (groq) is limited, second (openai) is not
        mock_redis.exists.return_value = False
        mock_redis.get.return_value = None

        limiter = RateLimiter.__new__(RateLimiter)
        limiter.redis_client = mock_redis
        limiter.limits = {"groq": {"rpm": 30}, "openai": {"rpm": 60}}

        # is_limited for openai will check redis and return False
        result = limiter.get_alternative_provider("groq", ["groq", "openai"])
        assert result == "openai"

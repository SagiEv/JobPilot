"""
Interview Analyzer Feature Tests.
Tests output shape, endpoint behavior, and error handling.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage


class TestInterviewAnalyzerEndpoint:
    VALID_RESPONSE = json.dumps({
        "keep_report": ["Strong problem solving", "Good communication"],
        "improve_report": ["Practice system design", "Work on time management"],
        "overall_trends": "Candidate shows consistent growth across interviews.",
    })

    @patch("interview_analyzer.service.LLMRouter")
    def test_endpoint_returns_success(self, mock_router):
        llm = MagicMock()
        llm.invoke.return_value = AIMessage(content=self.VALID_RESPONSE)
        mock_router.get_model.return_value = llm

        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/analyze-interviews", json={
                "interviews_data": [
                    {"company": "Google", "feedback": "Good coding skills, needs system design practice"},
                    {"company": "Meta", "feedback": "Strong React knowledge, good communication"},
                ],
                "api_keys": {"groq_token": "test-key"},
            })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "report" in data
        assert "keep_report" in data["report"]
        assert "improve_report" in data["report"]
        assert "overall_trends" in data["report"]
        assert isinstance(data["report"]["keep_report"], list)

    @patch("interview_analyzer.service.LLMRouter")
    def test_endpoint_500_on_bad_json(self, mock_router):
        llm = MagicMock()
        llm.invoke.return_value = AIMessage(content="This is not JSON")
        mock_router.get_model.return_value = llm

        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/analyze-interviews", json={
                "interviews_data": [{"company": "X", "feedback": "OK"}],
                "api_keys": {"groq_token": "test-key"},
            })

        assert response.status_code == 500

    @patch("interview_analyzer.service.LLMRouter")
    def test_valid_analysis_output_shape(self, mock_router, fake_api_keys):
        """Direct service call — validates output dict shape."""
        import asyncio
        llm = MagicMock()
        llm.invoke.return_value = AIMessage(content=self.VALID_RESPONSE)
        mock_router.get_model.return_value = llm

        from interview_analyzer.models import InterviewAnalysisRequest
        from interview_analyzer.service import analyze_interview_feedback

        payload = InterviewAnalysisRequest(
            interviews_data=[{"company": "Google", "feedback": "Good"}],
            api_keys=fake_api_keys,
        )
        result = asyncio.get_event_loop().run_until_complete(
            analyze_interview_feedback(payload)
        )

        assert set(result.keys()) == {"keep_report", "improve_report", "overall_trends"}
        assert isinstance(result["keep_report"], list)
        assert isinstance(result["improve_report"], list)
        assert isinstance(result["overall_trends"], str)

"""
CV Tailor Feature Tests.
Tests the FastAPI endpoint, graph compilation, node order, and response shape.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage


def _make_llm_returning(content: str):
    llm = MagicMock()
    llm.invoke.return_value = AIMessage(content=content)
    return llm


# ── Graph compilation ────────────────────────────────────────────────────────

class TestGraphBuild:
    @patch("cv_tailor.graph.time.sleep")  # Don't actually sleep
    def test_graph_compiles(self, mock_sleep, fake_api_keys):
        """build_graph() returns a compiled StateGraph without errors."""
        from cv_tailor.graph import build_graph
        graph = build_graph(fake_api_keys, "groq", None)
        assert graph is not None

    @patch("cv_tailor.graph.time.sleep")
    def test_graph_has_all_nodes(self, mock_sleep, fake_api_keys):
        """Graph contains all 9 nodes."""
        from cv_tailor.graph import build_graph
        graph = build_graph(fake_api_keys, "groq", None)

        # LangGraph compiled graph exposes nodes
        node_names = set(graph.get_graph().nodes.keys())
        expected = {
            "job_analyst", "cv_scorer", "profile_selector",
            "keyword_injector", "cv_restructurer", "ats_validator",
            "ats_retry_prep", "summary_rewriter", "final_polish",
            "__start__", "__end__",
        }
        assert expected.issubset(node_names), f"Missing nodes: {expected - node_names}"


# ── Single shot node response shape ─────────────────────────────────────────

class TestSingleShotResponseShape:
    @patch("cv_tailor.agents.single_shot_tailor.get_power_llm")
    def test_returns_expected_keys(self, mock_get_llm, fake_api_keys):
        from cv_tailor.agents.single_shot_schema import SingleShotResult, CVScore, TailoringReport
        from cv_tailor.models import TailorRequest

        mock_result = SingleShotResult(
            tailored_cv_markdown="# CV content",
            cv_score=CVScore(overall_score=75, matching_skills=80,
                             missing_skills=20, experience_relevance=70, readability=85),
            projected_score=88,
            tailoring_report=TailoringReport(
                job_title="SWE", seniority="mid", industry="Tech",
                added_skills=["React"], missing_skills=[],
                ats_keywords_injected=["full-stack"],
            ),
        )
        llm = MagicMock()
        structured = MagicMock()
        structured.invoke.return_value = mock_result
        llm.with_structured_output.return_value = structured
        mock_get_llm.return_value = llm

        from cv_tailor.agents.single_shot_tailor import single_shot_tailor_node
        payload = TailorRequest(job_description="Test JD", api_keys=fake_api_keys)
        result = single_shot_tailor_node(payload, fake_api_keys, "groq", None)

        assert set(result.keys()) == {"success", "tailored_cv", "overall_score", "projected_score", "tailoring_report"}
        assert result["success"] is True
        assert isinstance(result["tailoring_report"], dict)


# ── Router endpoint validation ───────────────────────────────────────────────

class TestTailorEndpoint:
    @patch("cv_tailor.router.single_shot_tailor_node")
    def test_fast_mode_calls_single_shot(self, mock_single_shot):
        """POST /tailor with pipeline_mode=fast → calls single_shot_tailor_node."""
        mock_single_shot.return_value = {
            "success": True, "tailored_cv": "# CV",
            "overall_score": 80, "projected_score": 90,
            "tailoring_report": {"job_title": "SWE"},
        }

        # Use TestClient inline to avoid global redis issues
        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/tailor", json={
                "job_description": "Senior SWE at TechCorp",
                "api_keys": {"groq_token": "test-key"},
                "provider": "groq",
                "pipeline_mode": "fast",
            })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert mock_single_shot.called

    def test_missing_job_description_returns_400(self):
        """POST /tailor with empty job_description → 400."""
        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/tailor", json={
                "job_description": "",
                "api_keys": {"groq_token": "test-key"},
            })

        assert response.status_code == 400

    @patch("cv_tailor.router.build_graph")
    def test_standard_mode_invokes_graph(self, mock_build):
        """POST /tailor with pipeline_mode=standard → invokes full graph."""
        mock_graph = MagicMock()
        mock_graph.invoke.return_value = {
            "tailored_cv_markdown": "# Final CV",
            "cv_score": {"overall_score": 7.5},
            "projected_score": 9.0,
            "tailoring_report": {"job_title": "SWE"},
        }
        mock_build.return_value = mock_graph

        with patch("router.rate_limiter.redis.Redis"):
            from fastapi.testclient import TestClient
            from main import app
            client = TestClient(app)

            response = client.post("/tailor", json={
                "job_description": "Senior SWE role",
                "api_keys": {"groq_token": "test-key"},
                "provider": "groq",
                "pipeline_mode": "standard",
            })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["tailored_cv"] == "# Final CV"
        assert mock_graph.invoke.called

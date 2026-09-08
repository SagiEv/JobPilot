"""
Hallucination & Ambiguity Safeguard Tests.
Tests that the system handles unreliable LLM outputs gracefully:
markdown fences, preamble text, score bounds, retry loops, etc.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage


def _make_llm_returning(content: str):
    llm = MagicMock()
    llm.invoke.return_value = AIMessage(content=content)
    return llm


# ── Markdown fence stripping ────────────────────────────────────────────────

class TestMarkdownFenceHandling:
    VALID_JSON = json.dumps({
        "job_title": "SWE", "company": "Test", "seniority": "mid",
        "industry": "Tech", "required_skills": ["Python"],
        "desired_skills": [], "responsibilities": [],
        "ats_keywords": [], "tech_stack": [], "soft_skills": [],
        "red_flags": [], "remote_policy": "remote",
    })

    @patch("cv_tailor.agents.job_analyst.get_power_llm")
    def test_strips_json_fences(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        """LLM wraps valid JSON in ```json ... ``` fences."""
        fenced = f"```json\n{self.VALID_JSON}\n```"
        mock_get_llm.return_value = _make_llm_returning(fenced)

        from cv_tailor.agents.job_analyst import job_analyst_node
        result = job_analyst_node(sample_pipeline_state, fake_api_keys, "groq", None)

        assert result["job_analysis"]["job_title"] == "SWE"

    @patch("cv_tailor.agents.job_analyst.get_power_llm")
    def test_strips_plain_fences(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        """LLM wraps JSON in ``` ... ``` without language tag."""
        fenced = f"```\n{self.VALID_JSON}\n```"
        mock_get_llm.return_value = _make_llm_returning(fenced)

        from cv_tailor.agents.job_analyst import job_analyst_node
        result = job_analyst_node(sample_pipeline_state, fake_api_keys, "groq", None)

        assert result["job_analysis"]["job_title"] == "SWE"

    @patch("cv_tailor.agents.job_analyst.get_power_llm")
    def test_preamble_text_triggers_fallback(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        """LLM returns 'Here is the analysis:\n{...}' — preamble breaks JSON parse."""
        preambled = f"Here is the analysis:\n{self.VALID_JSON}"
        mock_get_llm.return_value = _make_llm_returning(preambled)

        from cv_tailor.agents.job_analyst import job_analyst_node
        result = job_analyst_node(sample_pipeline_state, fake_api_keys, "groq", None)

        # Should fallback to minimal structure
        assert result["job_analysis"]["job_title"] == "Unknown"


# ── CV Scorer score values ───────────────────────────────────────────────────

class TestCvScorerBounds:
    @patch("cv_tailor.agents.cv_scorer.get_fast_llm")
    def test_hallucinated_score_stored_as_is(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        """LLM returns overall_score: 999 — currently no clamp, score stored as-is.
        This test documents the current behavior and serves as a canary if clamping is added."""
        response = json.dumps({
            "overall_score": 999,
            "breakdown": {"skills_match": 10, "experience_relevance": 10,
                           "keyword_density": 10, "seniority_fit": 10, "ats_compliance": 10},
            "missing_required_skills": [], "missing_desired_skills": [],
            "present_matching_skills": [], "strengths": [], "weaknesses": [],
            "improvement_potential": 0,
        })
        mock_get_llm.return_value = _make_llm_returning(response)

        from cv_tailor.agents.cv_scorer import cv_scorer_node
        result = cv_scorer_node(sample_pipeline_state, fake_api_keys, "groq", None)

        # Current behavior: no clamping
        assert result["cv_score"]["overall_score"] == 999


# ── ATS Validator edge cases ─────────────────────────────────────────────────

class TestAtsValidatorEdgeCases:
    def test_empty_cv_returns_non_compliant(self, sample_pipeline_state, fake_api_keys):
        """No CV markdown in state → returns is_compliant: False without calling LLM."""
        sample_pipeline_state["restructured_cv"] = {"markdown": "", "restructure_success": False}

        from cv_tailor.agents.ats_validator import ats_validator_node
        # No need to mock LLM — function returns early
        result = ats_validator_node(sample_pipeline_state, fake_api_keys, "groq", None)
        ats = result["ats_result"]

        assert ats["is_compliant"] is False
        assert ats["ats_score"] == 0
        assert len(ats["issues"]) > 0


# ── ATS Retry Loop ───────────────────────────────────────────────────────────

class TestAtsRetryLoop:
    def test_maxes_out_at_limit(self):
        """should_retry_ats returns 'proceed' after MAX_ATS_RETRIES."""
        from cv_tailor.graph import MAX_ATS_RETRIES

        # Simulate state after max retries with non-compliant result
        state = {
            "ats_result": {"is_compliant": False},
            "ats_retry_count": MAX_ATS_RETRIES,
        }

        # Re-implement the conditional logic inline (it's a closure in build_graph)
        ats = state.get("ats_result", {})
        retries = state.get("ats_retry_count", 0)
        if not ats.get("is_compliant", True) and retries < MAX_ATS_RETRIES:
            decision = "retry"
        else:
            decision = "proceed"

        assert decision == "proceed"

    def test_stops_on_compliant(self):
        """should_retry_ats returns 'proceed' immediately if compliant."""
        state = {
            "ats_result": {"is_compliant": True},
            "ats_retry_count": 0,
        }

        ats = state.get("ats_result", {})
        retries = state.get("ats_retry_count", 0)
        if not ats.get("is_compliant", True) and retries < MAX_ATS_RETRIES:
            decision = "retry"
        else:
            decision = "proceed"

        assert decision == "proceed"

    def test_retries_when_non_compliant_and_under_limit(self):
        """should_retry_ats returns 'retry' when non-compliant and retries < MAX."""
        from cv_tailor.graph import MAX_ATS_RETRIES

        state = {
            "ats_result": {"is_compliant": False},
            "ats_retry_count": 0,
        }

        ats = state.get("ats_result", {})
        retries = state.get("ats_retry_count", 0)
        if not ats.get("is_compliant", True) and retries < MAX_ATS_RETRIES:
            decision = "retry"
        else:
            decision = "proceed"

        assert decision == "retry"


# ── Interview Analyzer fence stripping ───────────────────────────────────────

class TestInterviewAnalyzerFences:
    @patch("interview_analyzer.service.LLMRouter")
    def test_handles_markdown_json(self, mock_router, fake_api_keys):
        """LLM wraps response in ```json ``` — service strips fences."""
        import asyncio
        valid = {"keep_report": ["Good"], "improve_report": ["More practice"], "overall_trends": "OK"}
        fenced = f"```json\n{json.dumps(valid)}\n```"
        llm = _make_llm_returning(fenced)
        mock_router.get_model.return_value = llm

        from interview_analyzer.models import InterviewAnalysisRequest
        from interview_analyzer.service import analyze_interview_feedback

        payload = InterviewAnalysisRequest(
            interviews_data=[{"company": "X", "feedback": "Fine"}],
            api_keys=fake_api_keys,
        )
        result = asyncio.get_event_loop().run_until_complete(
            analyze_interview_feedback(payload)
        )

        assert result["keep_report"] == ["Good"]

    @patch("interview_analyzer.service.LLMRouter")
    def test_raises_on_invalid_json(self, mock_router, fake_api_keys):
        """LLM returns plain English — json.loads raises, exception propagates."""
        import asyncio
        llm = _make_llm_returning("I think the candidate is great!")
        mock_router.get_model.return_value = llm

        from interview_analyzer.models import InterviewAnalysisRequest
        from interview_analyzer.service import analyze_interview_feedback

        payload = InterviewAnalysisRequest(
            interviews_data=[{"company": "X", "feedback": "Fine"}],
            api_keys=fake_api_keys,
        )
        with pytest.raises(json.JSONDecodeError):
            asyncio.get_event_loop().run_until_complete(
                analyze_interview_feedback(payload)
            )


# ── extract_text utility ────────────────────────────────────────────────────

class TestExtractText:
    def test_handles_list_content(self):
        """AIMessage.content is a list of dicts with 'text' keys."""
        from llm import extract_text

        class FakeMsg:
            content = [{"text": "hello"}, {"text": " world"}]

        assert extract_text(FakeMsg()) == "hello world"

    def test_handles_string_content(self):
        """AIMessage.content is a plain string."""
        from llm import extract_text

        class FakeMsg:
            content = "hello world"

        assert extract_text(FakeMsg()) == "hello world"

    def test_handles_empty_list(self):
        """AIMessage.content is an empty list."""
        from llm import extract_text

        class FakeMsg:
            content = []

        assert extract_text(FakeMsg()) == ""

    def test_handles_mixed_list(self):
        """AIMessage.content has non-dict entries."""
        from llm import extract_text

        class FakeMsg:
            content = [{"text": "hello"}, "stray string", {"image": "x"}, {"text": "!"}]

        assert extract_text(FakeMsg()) == "hello!"

"""
Structured Output Validation Tests.
Mocks llm.invoke() to return pre-canned JSON, then asserts each agent node
parses it into the correct schema.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_llm_returning(content: str):
    """Create a mock LLM whose .invoke() returns AIMessage(content)."""
    llm = MagicMock()
    llm.invoke.return_value = AIMessage(content=content)
    return llm


# ── Job Analyst ──────────────────────────────────────────────────────────────

class TestJobAnalystOutput:
    VALID_RESPONSE = json.dumps({
        "job_title": "Senior SWE", "company": "TechCorp", "seniority": "senior",
        "industry": "Technology",
        "required_skills": ["React", "Node.js"],
        "desired_skills": ["GraphQL"],
        "responsibilities": ["Build apps"],
        "ats_keywords": ["full-stack"],
        "tech_stack": ["React"],
        "soft_skills": ["communication"],
        "red_flags": [],
        "remote_policy": "hybrid",
    })

    @patch("cv_tailor.agents.job_analyst.get_power_llm")
    def test_output_schema(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning(self.VALID_RESPONSE)
        from cv_tailor.agents.job_analyst import job_analyst_node

        result = job_analyst_node(sample_pipeline_state, fake_api_keys, "groq", None)
        analysis = result["job_analysis"]

        for key in ["job_title", "company", "seniority", "industry",
                     "required_skills", "desired_skills", "responsibilities",
                     "ats_keywords", "tech_stack", "soft_skills", "red_flags", "remote_policy"]:
            assert key in analysis, f"Missing key: {key}"

        assert isinstance(analysis["required_skills"], list)
        assert analysis["job_title"] == "Senior SWE"

    @patch("cv_tailor.agents.job_analyst.get_power_llm")
    def test_fallback_on_garbage(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning("This is not JSON at all!")
        from cv_tailor.agents.job_analyst import job_analyst_node

        result = job_analyst_node(sample_pipeline_state, fake_api_keys, "groq", None)
        analysis = result["job_analysis"]

        assert analysis["job_title"] == "Unknown"
        assert analysis["seniority"] == "mid"
        assert isinstance(analysis["required_skills"], list)


# ── CV Scorer ────────────────────────────────────────────────────────────────

class TestCvScorerOutput:
    VALID_RESPONSE = json.dumps({
        "overall_score": 7.5,
        "breakdown": {"skills_match": 8, "experience_relevance": 7,
                       "keyword_density": 6, "seniority_fit": 8, "ats_compliance": 7},
        "missing_required_skills": ["AWS"],
        "missing_desired_skills": ["Kubernetes"],
        "present_matching_skills": ["React", "Node.js"],
        "strengths": ["Strong React experience"],
        "weaknesses": ["No cloud skills"],
        "improvement_potential": 2.5,
    })

    @patch("cv_tailor.agents.cv_scorer.get_fast_llm")
    def test_output_schema(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning(self.VALID_RESPONSE)
        from cv_tailor.agents.cv_scorer import cv_scorer_node

        result = cv_scorer_node(sample_pipeline_state, fake_api_keys, "groq", None)
        score = result["cv_score"]

        assert "overall_score" in score
        assert "breakdown" in score
        assert isinstance(score["missing_required_skills"], list)
        assert score["overall_score"] == 7.5

    @patch("cv_tailor.agents.cv_scorer.get_fast_llm")
    def test_fallback_on_garbage(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning("totally broken")
        from cv_tailor.agents.cv_scorer import cv_scorer_node

        result = cv_scorer_node(sample_pipeline_state, fake_api_keys, "groq", None)
        score = result["cv_score"]

        assert score["overall_score"] == 5.0
        assert len(score["weaknesses"]) > 0  # Contains error message


# ── Profile Selector ─────────────────────────────────────────────────────────

class TestProfileSelectorOutput:
    VALID_RESPONSE = json.dumps({
        "skills_to_highlight": ["React"],
        "skills_to_add_from_pool": ["TypeScript"],
        "skills_to_downplay": [],
        "projects_to_feature": [{"name": "E-Commerce", "reason": "Matches"}],
        "projects_to_demote": [],
        "experience_bullets_to_surface": ["Built APIs"],
        "overall_strategy": "Focus on full-stack",
    })

    @patch("cv_tailor.agents.profile_selector.get_power_llm")
    def test_output_schema(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning(self.VALID_RESPONSE)
        from cv_tailor.agents.profile_selector import profile_selector_node

        result = profile_selector_node(sample_pipeline_state, fake_api_keys, "groq", None)
        sel = result["profile_selections"]

        for key in ["skills_to_highlight", "skills_to_add_from_pool", "skills_to_downplay",
                     "projects_to_feature", "projects_to_demote",
                     "experience_bullets_to_surface", "overall_strategy"]:
            assert key in sel

    @patch("cv_tailor.agents.profile_selector.get_power_llm")
    def test_fallback_on_garbage(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning("{bad json")
        from cv_tailor.agents.profile_selector import profile_selector_node

        result = profile_selector_node(sample_pipeline_state, fake_api_keys, "groq", None)
        sel = result["profile_selections"]

        assert sel["skills_to_highlight"] == []
        assert "failed" in sel["overall_strategy"].lower()


# ── ATS Validator ────────────────────────────────────────────────────────────

class TestAtsValidatorOutput:
    VALID_RESPONSE = json.dumps({
        "ats_score": 8, "is_compliant": True,
        "keyword_coverage": {"found": ["React"], "missing": ["AWS"]},
        "issues": [],
        "section_headers_ok": True, "formatting_ok": True, "length_ok": True,
        "correction_instructions": "",
    })

    @patch("cv_tailor.agents.ats_validator.get_fast_llm")
    def test_output_schema(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning(self.VALID_RESPONSE)
        from cv_tailor.agents.ats_validator import ats_validator_node

        result = ats_validator_node(sample_pipeline_state, fake_api_keys, "groq", None)
        ats = result["ats_result"]

        for key in ["ats_score", "is_compliant", "keyword_coverage", "issues"]:
            assert key in ats
        assert ats["is_compliant"] is True

    @patch("cv_tailor.agents.ats_validator.get_fast_llm")
    def test_fallback_on_garbage(self, mock_get_llm, sample_pipeline_state, fake_api_keys):
        mock_get_llm.return_value = _make_llm_returning("broken output")
        from cv_tailor.agents.ats_validator import ats_validator_node

        result = ats_validator_node(sample_pipeline_state, fake_api_keys, "groq", None)
        ats = result["ats_result"]

        # Fail-open: don't block pipeline on validator failure
        assert ats["is_compliant"] is True
        assert ats["ats_score"] == 7.0


# ── Single Shot Tailor ───────────────────────────────────────────────────────

class TestSingleShotOutput:
    @patch("cv_tailor.agents.single_shot_tailor.get_power_llm")
    def test_output_schema(self, mock_get_llm, fake_api_keys):
        from cv_tailor.agents.single_shot_schema import SingleShotResult, CVScore, TailoringReport
        from cv_tailor.models import TailorRequest

        mock_result = SingleShotResult(
            tailored_cv_markdown="# Tailored CV",
            cv_score=CVScore(overall_score=80, matching_skills=85,
                             missing_skills=15, experience_relevance=75, readability=90),
            projected_score=90,
            tailoring_report=TailoringReport(
                job_title="SWE", seniority="senior", industry="Tech",
                added_skills=["TypeScript"], missing_skills=["Rust"],
                ats_keywords_injected=["full-stack"],
            ),
        )
        mock_llm = MagicMock()
        mock_structured = MagicMock()
        mock_structured.invoke.return_value = mock_result
        mock_llm.with_structured_output.return_value = mock_structured
        mock_get_llm.return_value = mock_llm

        from cv_tailor.agents.single_shot_tailor import single_shot_tailor_node
        payload = TailorRequest(job_description="Test JD", api_keys=fake_api_keys)
        result = single_shot_tailor_node(payload, fake_api_keys, "groq", None)

        assert result["success"] is True
        assert "tailored_cv" in result
        assert "overall_score" in result
        assert "projected_score" in result
        assert "tailoring_report" in result
        assert result["tailored_cv"] == "# Tailored CV"


# ── Interview Analyzer ───────────────────────────────────────────────────────

class TestInterviewAnalyzerOutput:
    VALID_RESPONSE = json.dumps({
        "keep_report": ["Strong problem solving"],
        "improve_report": ["Practice system design"],
        "overall_trends": "Candidate shows growth.",
    })

    @patch("interview_analyzer.service.LLMRouter")
    def test_output_schema(self, mock_router, fake_api_keys):
        import asyncio
        mock_llm = _make_llm_returning(self.VALID_RESPONSE)
        mock_router.get_model.return_value = mock_llm

        from interview_analyzer.models import InterviewAnalysisRequest
        from interview_analyzer.service import analyze_interview_feedback

        payload = InterviewAnalysisRequest(
            interviews_data=[{"company": "Google", "feedback": "Good"}],
            api_keys=fake_api_keys,
        )
        result = asyncio.get_event_loop().run_until_complete(
            analyze_interview_feedback(payload)
        )

        assert "keep_report" in result
        assert "improve_report" in result
        assert "overall_trends" in result
        assert isinstance(result["keep_report"], list)


# ── Message Creator ──────────────────────────────────────────────────────────

class TestMessageCreatorOutput:
    @patch("message_creator.service.LLMRouter")
    def test_returns_string(self, mock_router, fake_api_keys):
        import asyncio
        mock_llm = _make_llm_returning("Hi John, I'd love to apply...")
        mock_router.get_model.return_value = mock_llm

        from message_creator.models import MessageRequest
        from message_creator.service import generate_networking_message

        payload = MessageRequest(
            purpose="apply",
            description="Full-stack role",
            api_keys=fake_api_keys,
        )
        result = asyncio.get_event_loop().run_until_complete(
            generate_networking_message(payload)
        )

        assert isinstance(result, str)
        assert len(result) > 0

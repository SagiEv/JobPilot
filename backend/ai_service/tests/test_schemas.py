"""
Pydantic Schema & JSON Contract Tests.
Validates that request/response models enforce correct types and constraints.
No LLM calls — pure model validation.
"""
import pytest
from pydantic import ValidationError


# ── TailorRequest ────────────────────────────────────────────────────────────

class TestTailorRequest:
    def test_valid_full_payload(self, sample_job_description, sample_skills_pool, sample_projects_pool):
        from cv_tailor.models import TailorRequest
        req = TailorRequest(
            job_description=sample_job_description,
            api_keys={"groq_token": "key"},
            provider="groq",
            base_cv="# My CV",
            cv_data={"summary": "test"},
            skills_pool=sample_skills_pool,
            projects_pool=sample_projects_pool,
            experience_text="4 years",
            mode="full",
            pipeline_mode="standard",
        )
        assert req.job_description == sample_job_description
        assert req.provider == "groq"

    def test_missing_job_description_raises(self):
        from cv_tailor.models import TailorRequest
        with pytest.raises(ValidationError) as exc_info:
            TailorRequest()
        assert "job_description" in str(exc_info.value)

    def test_defaults(self):
        from cv_tailor.models import TailorRequest
        req = TailorRequest(job_description="test JD")
        assert req.provider == "groq"
        assert req.mode == "full"
        assert req.pipeline_mode == "standard"
        assert req.api_keys == {}
        assert req.base_cv == ""
        assert req.skills_pool == []
        assert req.projects_pool == []


# ── SingleShotResult / CVScore / TailoringReport ─────────────────────────────

class TestSingleShotSchema:
    def test_single_shot_result_roundtrip(self):
        from cv_tailor.agents.single_shot_schema import SingleShotResult, CVScore, TailoringReport
        result = SingleShotResult(
            tailored_cv_markdown="# CV",
            cv_score=CVScore(overall_score=75, matching_skills=80,
                             missing_skills=20, experience_relevance=70, readability=85),
            projected_score=88,
            tailoring_report=TailoringReport(
                job_title="SWE", seniority="mid", industry="Tech",
                added_skills=["React"], missing_skills=["Rust"],
                ats_keywords_injected=["full-stack"],
            ),
        )
        data = result.model_dump()
        assert data["tailored_cv_markdown"] == "# CV"
        assert data["cv_score"]["overall_score"] == 75
        assert data["projected_score"] == 88
        assert "React" in data["tailoring_report"]["added_skills"]

    def test_cv_score_rejects_string(self):
        from cv_tailor.agents.single_shot_schema import CVScore
        with pytest.raises(ValidationError):
            CVScore(overall_score="high", matching_skills=0,
                    missing_skills=0, experience_relevance=0, readability=0)

    def test_tailoring_report_rejects_missing_fields(self):
        from cv_tailor.agents.single_shot_schema import TailoringReport
        with pytest.raises(ValidationError):
            TailoringReport(job_title="SWE")  # missing seniority, industry, etc.


# ── MessageRequest ───────────────────────────────────────────────────────────

class TestMessageRequest:
    def test_valid_minimal(self):
        from message_creator.models import MessageRequest
        req = MessageRequest(purpose="referral")
        assert req.purpose == "referral"
        assert req.language == "En"
        assert req.provider == "groq"

    def test_valid_full(self, sample_skills_pool, sample_projects_pool):
        from message_creator.models import MessageRequest
        req = MessageRequest(
            purpose="apply",
            job_link="https://example.com/job",
            description="Full-stack role",
            addressee_name="John",
            cv_text="My CV text",
            language="He",
            skills_pool=sample_skills_pool,
            projects_pool=sample_projects_pool,
            api_keys={"groq_token": "key"},
        )
        assert req.language == "He"
        assert req.purpose == "apply"

    def test_defaults(self):
        from message_creator.models import MessageRequest
        req = MessageRequest(purpose="referral")
        assert req.language == "En"
        assert req.provider == "groq"
        assert req.job_link == ""
        assert req.skills_pool == []


# ── InterviewAnalysisRequest ─────────────────────────────────────────────────

class TestInterviewRequest:
    def test_valid(self):
        from interview_analyzer.models import InterviewAnalysisRequest
        req = InterviewAnalysisRequest(
            interviews_data=[{"company": "Google", "feedback": "Good coding skills"}],
            api_keys={"groq_token": "key"},
        )
        assert len(req.interviews_data) == 1

    def test_missing_interviews_raises(self):
        from interview_analyzer.models import InterviewAnalysisRequest
        with pytest.raises(ValidationError) as exc_info:
            InterviewAnalysisRequest(api_keys={"groq_token": "key"})
        assert "interviews_data" in str(exc_info.value)


# ── EmbedRequest ─────────────────────────────────────────────────────────────

class TestEmbedRequest:
    def test_valid(self):
        from embed_router import EmbedRequest
        req = EmbedRequest(text="Hello world")
        assert req.text == "Hello world"

    def test_missing_text_raises(self):
        from embed_router import EmbedRequest
        with pytest.raises(ValidationError):
            EmbedRequest()

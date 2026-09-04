"""
Shared fixtures for the AI Service test suite.
All LLM calls are mocked — no API keys needed.
"""
import pytest
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage


@pytest.fixture
def fake_api_keys():
    return {
        "groq_token": "test-key-groq-xxx",
        "openai_token": "test-key-openai-xxx",
        "claude_token": "test-key-claude-xxx",
        "gemini_token": "test-key-gemini-xxx",
    }


@pytest.fixture
def sample_job_description():
    return (
        "Senior Full-Stack Engineer at TechCorp. "
        "Requirements: 5+ years React, Node.js, TypeScript, PostgreSQL, Redis, AWS. "
        "Nice to have: GraphQL, Kubernetes, Python/FastAPI. "
        "CI/CD pipelines, GitHub Actions, Docker."
    )


@pytest.fixture
def sample_cv_data():
    return {
        "summary": "Experienced software engineer with 4 years in web development.",
        "experience": "Software Engineer at StartupXYZ (2020-2024)",
        "education": "B.Sc. Computer Science, Tel Aviv University",
        "skills": "JavaScript, React, Node.js, Python, SQL",
    }


@pytest.fixture
def sample_skills_pool():
    return [
        {"name": "React", "category": "Frontend", "level": "Advanced"},
        {"name": "Node.js", "category": "Backend", "level": "Advanced"},
        {"name": "Python", "category": "Backend", "level": "Intermediate"},
        {"name": "PostgreSQL", "category": "Database", "level": "Advanced"},
        {"name": "Docker", "category": "DevOps", "level": "Intermediate"},
        {"name": "TypeScript", "category": "Language", "level": "Advanced"},
        {"name": "AWS", "category": "Cloud", "level": "Intermediate"},
        {"name": "Redis", "category": "Database", "level": "Beginner"},
    ]


@pytest.fixture
def sample_projects_pool():
    return [
        {
            "name": "E-Commerce Platform", "title": "E-Commerce Platform",
            "description": "Full-stack e-commerce app with React and Node.js",
            "tech": "React, Node.js, PostgreSQL", "tech_stack": "React, Node.js, PostgreSQL",
            "bullets": ["Built REST API", "Implemented payment system"],
        },
        {
            "name": "DevOps Dashboard", "title": "DevOps Dashboard",
            "description": "Monitoring dashboard for CI/CD pipelines",
            "tech": "Python, Docker, Grafana", "tech_stack": "Python, Docker, Grafana",
            "bullets": ["Containerized services", "Set up alerting"],
        },
        {
            "name": "Chat Application", "title": "Chat Application",
            "description": "Real-time chat with WebSocket support",
            "tech": "Socket.io, React, MongoDB", "tech_stack": "Socket.io, React, MongoDB",
            "bullets": ["Real-time messaging", "User authentication"],
        },
    ]


@pytest.fixture
def sample_base_cv():
    return (
        "# John Doe\n\n## Summary\nExperienced software engineer.\n\n"
        "## Technical Skills\nJavaScript, React, Node.js, Python, SQL\n\n"
        "## Experience\n### Software Engineer — StartupXYZ (2020-2024)\n"
        "- Built REST APIs with Node.js and Express\n- Developed React features\n\n"
        "## Education\nB.Sc. Computer Science, Tel Aviv University\n"
    )


@pytest.fixture
def mock_ai_message():
    """Factory for creating AIMessage objects."""
    def _make(content: str):
        return AIMessage(content=content)
    return _make


@pytest.fixture
def mock_llm(mock_ai_message):
    """MagicMock LLM whose .invoke() returns an AIMessage."""
    llm = MagicMock()
    llm.invoke.return_value = mock_ai_message('{"result": "mock"}')
    return llm


@pytest.fixture
def sample_job_analysis():
    return {
        "job_title": "Senior Full-Stack Engineer",
        "company": "TechCorp",
        "seniority": "senior",
        "industry": "Technology",
        "required_skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
        "desired_skills": ["GraphQL", "Kubernetes"],
        "responsibilities": ["Build scalable web apps", "Lead code reviews"],
        "ats_keywords": ["full-stack", "microservices", "CI/CD", "REST API"],
        "tech_stack": ["React", "Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS"],
        "soft_skills": ["communication", "leadership"],
        "red_flags": [],
        "remote_policy": "hybrid",
    }


@pytest.fixture
def sample_cv_score():
    return {
        "overall_score": 6.5,
        "breakdown": {
            "skills_match": 7.0, "experience_relevance": 6.0,
            "keyword_density": 5.0, "seniority_fit": 7.0, "ats_compliance": 6.5,
        },
        "missing_required_skills": ["AWS", "TypeScript"],
        "missing_desired_skills": ["GraphQL", "Kubernetes"],
        "present_matching_skills": ["React", "Node.js", "PostgreSQL"],
        "strengths": ["Strong React experience", "Database knowledge"],
        "weaknesses": ["Missing cloud experience"],
        "improvement_potential": 3.0,
    }


@pytest.fixture
def sample_pipeline_state(
    sample_job_description, sample_base_cv, sample_cv_data,
    sample_skills_pool, sample_projects_pool,
    sample_job_analysis, sample_cv_score,
):
    """Complete TailoringState dict with realistic data."""
    return {
        "job_description_raw": sample_job_description,
        "base_cv": sample_base_cv,
        "cv_data": sample_cv_data,
        "skills_pool": sample_skills_pool,
        "projects_pool": sample_projects_pool,
        "experience_text": "4 years building full-stack web apps.",
        "retrieved_projects": sample_projects_pool[:2],
        "retrieved_skills": sample_skills_pool[:5],
        "job_analysis": sample_job_analysis,
        "cv_score": sample_cv_score,
        "profile_selections": {
            "skills_to_highlight": ["React", "Node.js"],
            "skills_to_add_from_pool": ["TypeScript", "AWS"],
            "skills_to_downplay": [],
            "projects_to_feature": [{"name": "E-Commerce Platform", "reason": "Matches req"}],
            "projects_to_demote": [],
            "experience_bullets_to_surface": ["Built REST APIs"],
            "overall_strategy": "Emphasize full-stack and cloud experience",
        },
        "keyword_injections": {
            "injections": [{"keyword": "TypeScript", "target_section": "skills",
                           "injection_strategy": "add to skills list", "example_usage": "TypeScript"}],
            "sections_to_rename": [],
            "formatting_fixes": [],
        },
        "restructured_cv": {
            "markdown": "# John Doe\n## Summary\nSenior full-stack engineer...",
            "restructure_success": True,
        },
        "ats_result": {
            "ats_score": 8, "is_compliant": True,
            "keyword_coverage": {"found": ["React", "Node.js"], "missing": ["AWS"]},
            "issues": [], "section_headers_ok": True,
            "formatting_ok": True, "length_ok": True, "correction_instructions": "",
        },
        "ats_retry_count": 0,
        "rewritten_summary": "Dynamic senior full-stack engineer with 4+ years...",
        "polish_notes": "",
        "tailored_cv_markdown": "",
        "tailoring_report": {},
        "projected_score": 0,
        "error": None,
    }

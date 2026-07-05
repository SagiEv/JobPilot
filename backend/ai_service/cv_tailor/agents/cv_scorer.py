"""
Agent 2 — CV Scorer
Grades the base CV against the structured job analysis.
Uses: fast LLM (scoring task, deterministic)
"""
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from cv_tailor.state import TailoringState
from llm import get_fast_llm

SYSTEM = """You are a strict but fair CV reviewer and ATS expert.
Grade CVs objectively. Return ONLY valid JSON — no markdown fences, no explanation."""

PROMPT_TEMPLATE = """Compare this candidate's CV against the job requirements and give a detailed score.

JOB REQUIREMENTS (structured):
{job_analysis}

CANDIDATE'S BASE CV:
{base_cv}

ALL CANDIDATE SKILLS (from skills database):
{skills_list}

Return a single JSON object:
{{
  "overall_score": <number 0-10, one decimal>,
  "breakdown": {{
    "skills_match": <0-10>,
    "experience_relevance": <0-10>,
    "keyword_density": <0-10>,
    "seniority_fit": <0-10>,
    "ats_compliance": <0-10>
  }},
  "missing_required_skills": ["list of required skills not found in CV"],
  "missing_desired_skills": ["list of desired skills not found in CV"],
  "present_matching_skills": ["list of skills that match"],
  "strengths": ["2-4 specific strengths of this CV for this role"],
  "weaknesses": ["2-4 specific weaknesses or gaps"],
  "improvement_potential": <number 0-10, how much the CV could improve with tailoring>
}}"""


def cv_scorer_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_fast_llm(groq_api_key)

    skills_text = ", ".join(
        [f"{s.get('name', '')} ({s.get('level', '')})" for s in state.get("skills_pool", [])]
    ) or "No skills data available"

    prompt = PROMPT_TEMPLATE.format(
        job_analysis=json.dumps(state["job_analysis"], indent=2),
        base_cv=state.get("base_cv", "") or state.get("cv_data", {}) or "No CV data",
        skills_list=skills_text,
    )
    messages = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=prompt),
    ]
    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        score = json.loads(raw)
    except Exception as e:
        score = {
            "overall_score": 5.0,
            "breakdown": {
                "skills_match": 5.0, "experience_relevance": 5.0,
                "keyword_density": 5.0, "seniority_fit": 5.0, "ats_compliance": 5.0
            },
            "missing_required_skills": [],
            "missing_desired_skills": [],
            "present_matching_skills": [],
            "strengths": [],
            "weaknesses": [f"Scoring failed: {str(e)}"],
            "improvement_potential": 5.0,
        }
    return {"cv_score": score}

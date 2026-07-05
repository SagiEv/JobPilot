"""
Agent 3 — Profile Selector
Mines the full Supabase pool (skills, projects, experience) for
hidden content that fits the job better than the base CV.
Uses: power LLM (reasoning over large context)
"""
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from cv_tailor.state import TailoringState
from llm import get_power_llm

SYSTEM = """You are a career strategist helping a candidate surface the best
content from their full portfolio. Return ONLY valid JSON."""

PROMPT_TEMPLATE = """The candidate's base CV scored {score}/10 for this role.
Your job: identify which content from their full data pool should be promoted or demoted.

JOB ANALYSIS:
{job_analysis}

CV SCORE BREAKDOWN:
{cv_score}

FULL SKILLS POOL (all skills in database, not just those in the CV):
{skills_pool}

FULL PROJECTS POOL:
{projects_pool}

EXPERIENCE TEXT (raw):
{experience_text}

Return JSON:
{{
  "skills_to_highlight": ["skill names to prominently feature"],
  "skills_to_add_from_pool": ["skill names in pool but absent from CV that match the job"],
  "skills_to_downplay": ["skill names to move to bottom or remove"],
  "projects_to_feature": [
    {{"name": "project name", "reason": "why it fits"}}
  ],
  "projects_to_demote": ["project names less relevant to this role"],
  "experience_bullets_to_surface": ["specific bullet points or achievements from experience text that match job"],
  "overall_strategy": "one paragraph on the tailoring strategy for this candidate/role combo"
}}"""


def profile_selector_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_power_llm(groq_api_key)

    def fmt_skills(pool):
        return json.dumps([
            {"name": s.get("name"), "category": s.get("category"), "level": s.get("level")}
            for s in pool
        ], indent=2) if pool else "[]"

    def fmt_projects(pool):
        return json.dumps([
            {"name": p.get("name"), "tech": p.get("tech"), "bullets": p.get("bullets")}
            for p in pool
        ], indent=2) if pool else "[]"

    prompt = PROMPT_TEMPLATE.format(
        score=state["cv_score"].get("overall_score", 5),
        job_analysis=json.dumps(state["job_analysis"], indent=2),
        cv_score=json.dumps(state["cv_score"], indent=2),
        skills_pool=fmt_skills(state.get("skills_pool", [])),
        projects_pool=fmt_projects(state.get("projects_pool", [])),
        experience_text=state.get("experience_text", "") or "No experience text available",
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]
    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        selections = json.loads(raw)
    except Exception as e:
        selections = {
            "skills_to_highlight": [],
            "skills_to_add_from_pool": [],
            "skills_to_downplay": [],
            "projects_to_feature": [],
            "projects_to_demote": [],
            "experience_bullets_to_surface": [],
            "overall_strategy": f"Profile selection failed: {str(e)}",
        }
    return {"profile_selections": selections}

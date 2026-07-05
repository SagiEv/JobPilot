"""
Agent 5 — CV Restructurer
Produces the full restructured CV in Markdown.
Uses: power LLM (creative + largest task)
"""
import json
from langchain_core.messages import HumanMessage, SystemMessage
from cv_tailor.state import TailoringState
from llm import get_power_llm

SYSTEM = """You are an expert CV writer who creates compelling, ATS-optimized CVs.
Output ONLY the final CV in clean Markdown — no JSON, no explanation, no preamble.

CV FORMAT RULES:
- Use # for name, ## for section headers
- Use standard section names: Summary, Technical Skills, Experience, Projects, Education
- Use bullet points (-) for all lists
- Past tense for past roles, present tense for current role
- Strong action verbs to start each bullet (Led, Built, Designed, Delivered, Reduced)
- Include quantifiable results where possible
- NO tables, NO graphics, NO special characters that ATS can't read
- Keep it to 1-2 pages worth of content"""

PROMPT_TEMPLATE = """Produce a fully tailored CV using all the analysis below.

CANDIDATE ORIGINAL CV:
{base_cv}

JOB ANALYSIS (target role):
{job_analysis}

PROFILE SELECTIONS (what to add/promote/demote):
{profile_selections}

KEYWORD INJECTION PLAN (follow this):
{keyword_injections}

FULL PROJECTS POOL (use featured ones, demote others):
{projects_pool}

FULL SKILLS POOL (use recommended ones):
{skills_pool}

EXPERIENCE TEXT (raw, mine for bullets):
{experience_text}

Instructions:
1. Start with a strong tailored Summary section
2. List Technical Skills — prominently feature the highlighted/added ones
3. Experience section — reorder bullets so most relevant to the job come first
4. Projects section — feature recommended projects, move demoted ones to end or remove
5. Keep Education, Certifications as-is
6. Weave in ATS keywords naturally throughout
7. Output ONLY the Markdown CV — nothing else"""


def cv_restructurer_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_power_llm(groq_api_key)

    def fmt_projects(pool):
        return "\n".join([
            f"- **{p.get('name')}** | {p.get('tech', '')} — {', '.join(p.get('bullets', []) or [])}"
            for p in (pool or [])
        ]) or "No projects data"

    def fmt_skills(pool):
        by_cat = {}
        for s in (pool or []):
            cat = s.get("category", "Other")
            by_cat.setdefault(cat, []).append(s.get("name", ""))
        return "\n".join([f"**{cat}**: {', '.join(names)}" for cat, names in by_cat.items()]) or "No skills"

    base_cv = state.get("base_cv") or ""
    if not base_cv and state.get("cv_data"):
        cv_data = state["cv_data"]
        base_cv = "\n\n".join([
            f"## {k.title()}\n{v}" for k, v in cv_data.items() if v
        ])

    prompt = PROMPT_TEMPLATE.format(
        base_cv=base_cv or "No base CV provided — construct from profile data below",
        job_analysis=json.dumps(state["job_analysis"], indent=2),
        profile_selections=json.dumps(state.get("profile_selections", {}), indent=2),
        keyword_injections=json.dumps(state.get("keyword_injections", {}), indent=2),
        projects_pool=fmt_projects(state.get("projects_pool", [])),
        skills_pool=fmt_skills(state.get("skills_pool", [])),
        experience_text=state.get("experience_text", "") or "No experience text",
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]
    try:
        response = llm.invoke(messages)
        cv_md = response.content.strip()
        restructured = {"markdown": cv_md, "restructure_success": True}
    except Exception as e:
        restructured = {
            "markdown": base_cv,
            "restructure_success": False,
            "error": str(e),
        }
    return {"restructured_cv": restructured}

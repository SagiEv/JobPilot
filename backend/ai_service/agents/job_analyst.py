"""
Agent 1 — Job Analyst
Parses the raw job description into a structured profile.
Uses: power LLM (complex extraction)
"""
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from state import TailoringState
from llm import get_power_llm

SYSTEM = """You are a senior technical recruiter and job analyst.
Your job is to parse a raw job description into clean, structured JSON.
Return ONLY valid JSON — no markdown fences, no explanation, no preamble."""

PROMPT_TEMPLATE = """Analyze this job description and extract the following fields.
Return a single flat JSON object with exactly these keys:

{{
  "job_title": "string",
  "company": "string or null",
  "seniority": "junior | mid | senior | lead | staff | principal | executive",
  "industry": "string",
  "required_skills": ["list", "of", "required", "skills"],
  "desired_skills": ["list", "of", "nice-to-have", "skills"],
  "responsibilities": ["list", "of", "key", "responsibilities"],
  "ats_keywords": ["high-value", "ATS", "keywords", "from", "the", "description"],
  "tech_stack": ["specific", "technologies", "tools", "mentioned"],
  "soft_skills": ["communication", "leadership", "etc"],
  "red_flags": ["any concerns like unrealistic requirements or vague role"],
  "remote_policy": "remote | hybrid | onsite | unknown"
}}

JOB DESCRIPTION:
{job_description}"""


def job_analyst_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_power_llm(groq_api_key)
    prompt = PROMPT_TEMPLATE.format(job_description=state["job_description_raw"])
    messages = [
        SystemMessage(content=SYSTEM),
        HumanMessage(content=prompt),
    ]
    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        # Strip markdown fences if model wraps output despite instructions
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        analysis = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        # Fallback: return minimal structure so pipeline can continue
        analysis = {
            "job_title": "Unknown",
            "company": None,
            "seniority": "mid",
            "industry": "Technology",
            "required_skills": [],
            "desired_skills": [],
            "responsibilities": [],
            "ats_keywords": [],
            "tech_stack": [],
            "soft_skills": [],
            "red_flags": [f"Job analysis failed: {str(e)}"],
            "remote_policy": "unknown",
        }
    return {"job_analysis": analysis}

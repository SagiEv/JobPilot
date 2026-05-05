"""
Agent 7 — Summary Rewriter
Rewrites the profile summary specifically for the target role.
Uses: power LLM (prose quality critical)
"""
import json
from langchain_core.messages import HumanMessage, SystemMessage
from state import TailoringState
from llm import get_power_llm

SYSTEM = """You are a professional CV copywriter specializing in compelling executive summaries.
Output ONLY the rewritten summary paragraph — no labels, no JSON, no explanation."""

PROMPT_TEMPLATE = """Rewrite this candidate's professional summary to be perfectly tailored for the target role.

TARGET ROLE: {job_title} at {company}
SENIORITY: {seniority}
KEY REQUIREMENTS: {key_requirements}
ATS KEYWORDS TO INCLUDE: {ats_keywords}

CANDIDATE STRENGTHS (from CV analysis):
{strengths}

CURRENT SUMMARY:
{current_summary}

INSTRUCTIONS:
- 3-4 sentences max, punchy and confident
- Open with a strong professional identity statement
- Mention the target role/industry naturally in the 2nd sentence
- Include 2-3 specific ATS keywords without sounding robotic
- Close with what the candidate brings to this specific role
- Past tense for accomplishments, present tense for current abilities
- Output ONLY the summary text — no headers, no "Summary:" label"""


def summary_rewriter_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_power_llm(groq_api_key)

    job = state["job_analysis"]
    cv_data = state.get("cv_data", {}) or {}
    current_summary = (
        cv_data.get("summary") or
        cv_data.get("objective") or
        "No existing summary"
    )
    # Also check base_cv for summary section
    if current_summary == "No existing summary" and state.get("base_cv"):
        base = state["base_cv"]
        # Simple heuristic: look for Summary section
        if "Summary" in base or "summary" in base:
            lines = base.split("\n")
            in_summary = False
            summary_lines = []
            for line in lines:
                if "summary" in line.lower() and line.strip().startswith("#"):
                    in_summary = True
                    continue
                if in_summary:
                    if line.strip().startswith("#"):
                        break
                    if line.strip():
                        summary_lines.append(line.strip())
            if summary_lines:
                current_summary = " ".join(summary_lines[:3])

    prompt = PROMPT_TEMPLATE.format(
        job_title=job.get("job_title", "the role"),
        company=job.get("company") or "the company",
        seniority=job.get("seniority", "mid-level"),
        key_requirements=", ".join(job.get("required_skills", [])[:6]),
        ats_keywords=", ".join(job.get("ats_keywords", [])[:8]),
        strengths="\n".join(state["cv_score"].get("strengths", ["Strong technical background"])),
        current_summary=current_summary,
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]
    try:
        response = llm.invoke(messages)
        rewritten = response.content.strip()
    except Exception as e:
        rewritten = current_summary  # Fallback to original
    return {"rewritten_summary": rewritten}

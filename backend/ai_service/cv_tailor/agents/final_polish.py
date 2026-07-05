"""
Agent 8 — Final Polish
Last pass: replaces the summary in the restructured CV with the rewritten one,
fixes tone/tense/verb strength, and produces the final CV + tailoring report.
Uses: power LLM
"""
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from cv_tailor.state import TailoringState
from llm import get_power_llm

SYSTEM = """You are a senior CV editor doing a final quality pass.
You will receive a CV draft and a rewritten summary. Your job:
1. Replace the existing summary section with the provided rewritten one
2. Fix any weak verbs (e.g. "worked on" → "Delivered", "helped with" → "Drove")
3. Ensure consistent past tense for past roles
4. Remove any filler phrases ("responsible for", "duties included", "assisted in")
5. Ensure bullet points start with strong action verbs
6. Output ONLY the final polished CV in Markdown"""

PROMPT_TEMPLATE = """Here is the restructured CV draft:

{cv_draft}

Here is the rewritten summary (use this to REPLACE the existing summary section):

{rewritten_summary}

ATS validation score: {ats_score}/10
ATS issues to fix:
{ats_issues}

Polish the CV: fix verb strength, tense consistency, remove filler, inject the new summary.
Output ONLY the final Markdown CV."""


def final_polish_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_power_llm(groq_api_key)

    cv_draft = state.get("restructured_cv", {}).get("markdown", "")
    rewritten_summary = state.get("rewritten_summary", "")
    ats_result = state.get("ats_result", {})
    ats_score = ats_result.get("ats_score", 7)
    ats_issues = "\n".join([
        f"- [{i.get('severity', 'low')}] {i.get('issue', '')}"
        for i in ats_result.get("issues", [])
    ]) or "None"

    prompt = PROMPT_TEMPLATE.format(
        cv_draft=cv_draft,
        rewritten_summary=rewritten_summary or "Use the existing summary",
        ats_score=ats_score,
        ats_issues=ats_issues,
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]
    try:
        response = llm.invoke(messages)
        final_cv = response.content.strip()
    except Exception as e:
        final_cv = cv_draft  # Fallback — still return something

    # Build the tailoring report
    score = state.get("cv_score", {})
    selections = state.get("profile_selections", {})
    job = state.get("job_analysis", {})

    projected_score = min(10.0, score.get("overall_score", 5) + score.get("improvement_potential", 2))

    report = {
        "original_score": score.get("overall_score", 0),
        "projected_score": round(projected_score, 1),
        "score_breakdown": score.get("breakdown", {}),
        "job_title": job.get("job_title", "Unknown"),
        "missing_skills_addressed": selections.get("skills_to_add_from_pool", []),
        "skills_highlighted": selections.get("skills_to_highlight", []),
        "skills_downplayed": selections.get("skills_to_downplay", []),
        "projects_featured": [p.get("name") if isinstance(p, dict) else p for p in selections.get("projects_to_feature", [])],
        "projects_demoted": selections.get("projects_to_demote", []),
        "ats_score": ats_score,
        "ats_keywords_added": ats_result.get("keyword_coverage", {}).get("found", []),
        "ats_keywords_still_missing": ats_result.get("keyword_coverage", {}).get("missing", []),
        "cv_strengths": score.get("strengths", []),
        "strategy": selections.get("overall_strategy", ""),
    }

    return {
        "tailored_cv_markdown": final_cv,
        "tailoring_report": report,
        "projected_score": round(projected_score, 1),
        "polish_notes": f"ATS score: {ats_score}/10. Projected improvement: {score.get('overall_score', 5)} → {round(projected_score, 1)}",
    }

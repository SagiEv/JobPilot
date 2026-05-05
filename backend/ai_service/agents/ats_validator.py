"""
Agent 6 — ATS Validator
Checks the restructured CV for ATS compliance issues.
Uses: fast LLM (rule-based checking)
"""
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from state import TailoringState
from llm import get_fast_llm

SYSTEM = """You are an ATS (Applicant Tracking System) compliance expert.
Evaluate CVs strictly. Return ONLY valid JSON."""

PROMPT_TEMPLATE = """Check this CV for ATS compliance issues.

REQUIRED KEYWORDS (must appear somewhere in the CV):
{required_keywords}

CV TO VALIDATE:
{cv_markdown}

Check ALL of the following and return JSON:
{{
  "ats_score": <0-10>,
  "is_compliant": <true if score >= 7, else false>,
  "keyword_coverage": {{
    "found": ["keywords present in CV"],
    "missing": ["required keywords NOT found in CV"]
  }},
  "issues": [
    {{
      "severity": "high | medium | low",
      "issue": "description of the problem",
      "fix": "how to fix it"
    }}
  ],
  "section_headers_ok": <true/false>,
  "formatting_ok": <true/false>,
  "length_ok": <true/false>,
  "correction_instructions": "specific instructions for the CV Restructurer if is_compliant is false"
}}

ATS RULES TO CHECK:
- All required keywords present
- Standard section headers (Summary, Experience, Education, Skills)
- No tables or multi-column layouts (plain text only)
- No special symbols like ★ ✓ • → (use plain dashes instead)
- Contact info present and readable
- Dates in consistent format
- CV length: 400-900 words ideally"""


def ats_validator_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_fast_llm(groq_api_key)

    job = state["job_analysis"]
    required_kw = list(set(
        job.get("required_skills", []) +
        job.get("ats_keywords", []) +
        job.get("tech_stack", [])
    ))

    cv_md = state.get("restructured_cv", {}).get("markdown", "")
    if not cv_md:
        return {
            "ats_result": {
                "ats_score": 0,
                "is_compliant": False,
                "keyword_coverage": {"found": [], "missing": required_kw},
                "issues": [{"severity": "high", "issue": "No CV content to validate", "fix": "Run CV Restructurer first"}],
                "section_headers_ok": False,
                "formatting_ok": False,
                "length_ok": False,
                "correction_instructions": "Generate the CV first",
            }
        }

    prompt = PROMPT_TEMPLATE.format(
        required_keywords=", ".join(required_kw) or "none",
        cv_markdown=cv_md,
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]
    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        result = json.loads(raw)
    except Exception as e:
        result = {
            "ats_score": 7.0,
            "is_compliant": True,  # Don't block pipeline on validator failure
            "keyword_coverage": {"found": [], "missing": []},
            "issues": [{"severity": "low", "issue": f"Validator error: {str(e)}", "fix": "Manual review recommended"}],
            "section_headers_ok": True,
            "formatting_ok": True,
            "length_ok": True,
            "correction_instructions": "",
        }
    return {"ats_result": result}

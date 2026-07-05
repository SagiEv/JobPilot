"""
Agent 4 — Keyword Injector
Plans where to inject ATS keywords naturally.
Uses: fast LLM (mechanical task)
"""
import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from cv_tailor.state import TailoringState
from llm import get_fast_llm

SYSTEM = """You are an ATS keyword strategy expert. Return ONLY valid JSON."""

PROMPT_TEMPLATE = """Plan keyword injection for this CV to improve ATS score.
Do NOT write the full CV — only plan WHERE and HOW to inject each keyword.

ATS KEYWORDS NEEDED:
{ats_keywords}

CURRENT CV CONTENT:
{base_cv}

PROFILE SELECTIONS (what content to add/highlight):
{profile_selections}

Return JSON:
{{
  "injections": [
    {{
      "keyword": "exact keyword",
      "target_section": "summary | skills | experience | projects",
      "injection_strategy": "add to skills list | weave into bullet | use in summary sentence",
      "example_usage": "an example sentence showing natural use of the keyword"
    }}
  ],
  "sections_to_rename": [
    {{"current": "old name", "new": "ATS-friendly name"}}
  ],
  "formatting_fixes": ["list of ATS formatting issues to fix e.g. remove tables, remove icons"]
}}"""


def keyword_injector_node(state: TailoringState, groq_api_key: str) -> dict:
    llm = get_fast_llm(groq_api_key)

    ats_keywords = state["job_analysis"].get("ats_keywords", [])
    tech_stack = state["job_analysis"].get("tech_stack", [])
    all_keywords = list(set(ats_keywords + tech_stack))

    prompt = PROMPT_TEMPLATE.format(
        ats_keywords=", ".join(all_keywords) or "none identified",
        base_cv=state.get("base_cv", "") or json.dumps(state.get("cv_data", {})),
        profile_selections=json.dumps(state.get("profile_selections", {}), indent=2),
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]
    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        injections = json.loads(raw)
    except Exception as e:
        injections = {
            "injections": [],
            "sections_to_rename": [],
            "formatting_fixes": [f"Keyword injection planning failed: {str(e)}"],
        }
    return {"keyword_injections": injections}

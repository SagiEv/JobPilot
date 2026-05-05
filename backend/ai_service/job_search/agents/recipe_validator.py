#AI node: test-scrapes with selectors, assembles final recipe
"""
Search Agent 3 — Recipe Validator
Takes the site_structure + selectors, attempts a test scrape,
and assembles the final SiteRecipe.
Also asks LLM to sanity-check if the recipe makes sense.
Runs ONCE per site.
"""
import re
import json
import requests
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from job_search.state import SearchState, SiteRecipe
from datetime import datetime

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from llm import get_fast_llm

SYSTEM = """You are validating a web scraping recipe for a careers page.
Check if the recipe is consistent and complete. Return ONLY valid JSON."""

PROMPT_TEMPLATE = """Validate and finalize this scraping recipe.

SITE STRUCTURE ANALYSIS:
{site_structure}

EXTRACTED SELECTORS:
{selectors}

TEST SCRAPE RESULT (what the selectors actually found):
{test_result}

Review everything and return the final recipe JSON:
{{
  "is_valid": true | false,
  "confidence": "high" | "medium" | "low",
  "search_mechanism": {{...}},   // use site_structure data, fix if needed
  "pagination": {{...}},          // use site_structure data, fix if needed
  "selectors": {{...}},           // use extracted selectors, fix if needed
  "requires_js": true | false,
  "notes": "final observations — mention if recipe has low confidence and may need manual review"
}}

If test_result shows 0 jobs found but the page clearly has jobs, set requires_js true.
If selectors look wrong, correct them based on your analysis.
"""


def _extract_json(raw: str) -> str:
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"//[^\n]*\n", "\n", raw)
    raw = re.sub(r",\s*([}\]])", r"\1", raw)
    brace_count = 0
    start = None
    for i, ch in enumerate(raw):
        if ch == "{":
            if start is None:
                start = i
            brace_count += 1
        elif ch == "}":
            brace_count -= 1
            if brace_count == 0 and start is not None:
                return raw[start:i+1]
    return raw


def _test_selectors(url: str, selectors: dict) -> dict:
    """
    Attempt a quick test scrape using the extracted selectors.
    Returns a summary of what was found — passed to LLM for validation.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        container_sel = selectors.get("job_container")
        if not container_sel:
            return {"jobs_found": 0, "error": "No job_container selector"}

        containers = soup.select(container_sel)
        if not containers:
            return {"jobs_found": 0, "selector_tried": container_sel, "error": "Selector matched 0 elements"}

        # Sample first 3 jobs
        samples = []
        for c in containers[:3]:
            sample = {}
            for field in ["title", "location", "link", "description_snippet"]:
                sel = selectors.get(field)
                if sel:
                    el = c.select_one(sel)
                    if el:
                        sample[field] = el.get_text(strip=True)[:100] or el.get("href", "")
            samples.append(sample)

        return {
            "jobs_found": len(containers),
            "samples": samples,
        }
    except Exception as e:
        return {"jobs_found": 0, "error": str(e)}


def recipe_validator_node(state: SearchState, groq_api_key: str) -> dict:
    llm = get_fast_llm(groq_api_key)

    url = state["careers_url"]
    company = state["company"]
    site_structure = state.get("site_structure", {})
    selectors = state.get("extracted_selectors", {})

    # Run a test scrape
    test_result = _test_selectors(url, selectors)

    prompt = PROMPT_TEMPLATE.format(
        site_structure=json.dumps(site_structure, indent=2),
        selectors=json.dumps(selectors, indent=2),
        test_result=json.dumps(test_result, indent=2),
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]

    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        validated = json.loads(_extract_json(raw))
    except Exception as e:
        # Fallback: assemble recipe from what we have without LLM validation
        validated = {
            "is_valid": test_result.get("jobs_found", 0) > 0,
            "confidence": "low",
            "search_mechanism": site_structure.get("search_mechanism", {"type": "unknown"}),
            "pagination": site_structure.get("pagination", {"type": "none"}),
            "selectors": selectors,
            "requires_js": site_structure.get("requires_js", True),
            "notes": f"Validator LLM failed: {e}. Test found {test_result.get('jobs_found', 0)} jobs.",
        }

    # Assemble final SiteRecipe
    recipe: SiteRecipe = {
        "company": company,
        "careers_url": url,
        "last_analyzed": datetime.now().date().isoformat(),
        "failure_count": 0,
        "search_mechanism": validated.get("search_mechanism", site_structure.get("search_mechanism", {})),
        "pagination": validated.get("pagination", site_structure.get("pagination", {})),
        "selectors": validated.get("selectors", selectors),
        "requires_js": validated.get("requires_js", True),
        "notes": validated.get("notes", ""),
    }

    return {
        "validation_result": validated,
        "recipe": recipe,
    }
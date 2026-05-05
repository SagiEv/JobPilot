#AI node: finds CSS selectors for job containers/titles/links
"""
Search Agent 2 — Selector Extractor
Given the raw HTML of the careers page, uses LLM to identify
the CSS selectors needed to extract job listings.
Result is saved into the recipe — used by dumb scraper forever.
Runs ONCE per site.
"""
import re
import json
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from job_search.state import SearchState

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from llm import get_fast_llm

SYSTEM = """You are an expert at identifying CSS selectors for web scraping.
Given HTML from a careers/jobs page, find the exact CSS selectors to extract job data.
Return ONLY valid JSON."""

PROMPT_TEMPLATE = """Find CSS selectors for job listings on this careers page.

URL: {url}
HTML SNIPPET (relevant section):
{html_snippet}

Return JSON with this exact structure:
{{
  "job_container": "CSS selector that matches each individual job listing card/row",
  "title": "CSS selector for job title (relative to job_container)",
  "location": "CSS selector for job location (relative to job_container), or null if not present",
  "link": "CSS selector for the link to the full job page (relative to job_container)",
  "description_snippet": "CSS selector for short description or department (relative to job_container), or null",
  "no_results_indicator": "CSS selector that appears when search has no results, or null",
  "confidence": "high" | "medium" | "low",
  "notes": "anything important — e.g. if jobs load via JS and selectors may not work with requests"
}}

Rules:
- job_container is the most important — it's the repeating element that wraps each job
- All other selectors are RELATIVE to job_container (not absolute from page root)
- For links, prefer selectors that include the href attribute
- If the HTML looks like an SPA shell with no actual job listings, set confidence to low and note it
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


def _extract_relevant_html(html: str) -> str:
    """Pull out the most job-listing-dense section of the HTML."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Heuristic: find the tag with the most list items or repeated divs
    candidates = []
    for tag in soup.find_all(["ul", "div", "section", "main"]):
        children = tag.find_all(recursive=False)
        if len(children) >= 3:
            candidates.append((len(children), str(tag)[:2000]))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    # Fallback: just return the body, truncated
    body = soup.find("body")
    return str(body)[:2500] if body else html[:2500]


def selector_extractor_node(state: SearchState, groq_api_key: str) -> dict:
    llm = get_fast_llm(groq_api_key)

    html = state.get("page_html", "")
    url = state["careers_url"]

    if not html:
        return {
            "extracted_selectors": {
                "job_container": None,
                "title": None,
                "location": None,
                "link": "a[href]",
                "description_snippet": None,
                "no_results_indicator": None,
                "confidence": "low",
                "notes": "No HTML available to analyze",
            }
        }

    html_snippet = _extract_relevant_html(html)

    prompt = PROMPT_TEMPLATE.format(url=url, html_snippet=html_snippet)
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]

    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        selectors = json.loads(_extract_json(raw))
    except Exception as e:
        selectors = {
            "job_container": None,
            "title": None,
            "location": None,
            "link": "a[href]",
            "description_snippet": None,
            "no_results_indicator": None,
            "confidence": "low",
            "notes": f"Selector extraction failed: {e}",
        }

    return {"extracted_selectors": selectors}
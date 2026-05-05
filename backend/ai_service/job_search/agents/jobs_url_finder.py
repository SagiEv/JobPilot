"""
Search Agent 0 — Jobs URL Finder
Given any company URL (homepage, about page, etc.),
finds the actual careers/jobs search page URL.
This runs before site_explorer so the rest of the pipeline
always gets a page that actually has job listings.
Runs ONCE per site.
"""
import re
import json
import logging
import requests
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from job_search.state import SearchState

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from llm import get_fast_llm

logger = logging.getLogger(__name__)

SYSTEM = """You are an expert at finding careers/jobs pages on company websites.
Given a URL and page content, find the best URL to use for job searching.
Return ONLY valid JSON."""

PROMPT_TEMPLATE = """Find the best URL for searching jobs at this company.

INPUT URL: {url}
PAGE LINKS FOUND:
{links}

PAGE TEXT PREVIEW:
{text_preview}

Return JSON:
{{
  "best_search_url": "the full URL of the jobs search/listing page",
  "confidence": "high" | "medium" | "low",
  "notes": "why you chose this URL"
}}

Rules:
- Prefer URLs that contain: jobs, careers, search, positions, openings
- Prefer URLs with search/query parameters already set (e.g. ?q= or ?search=)
- If input URL already looks like a search/listing page (has job listings in text), return it as-is
- Always return a full absolute URL (https://...)
- For Microsoft: use https://jobs.careers.microsoft.com/global/en/search
- For LinkedIn: not applicable (too restricted)
"""

# Known overrides for major companies — avoids wasting LLM calls
KNOWN_SEARCH_URLS = {
    "careers.microsoft.com": "https://jobs.careers.microsoft.com/global/en/search",
    "jobs.careers.microsoft.com": "https://jobs.careers.microsoft.com/global/en/search",
    "greenhouse.io": None,       # Pattern-based, handled by site_explorer
    "lever.co": None,
    "workday.com": None,
}


def _get_domain(url: str) -> str:
    from urllib.parse import urlparse
    return urlparse(url).netloc.replace("www.", "")


def _extract_career_links(html: str, base_url: str) -> list[str]:
    """Extract all links that look job/career related."""
    from urllib.parse import urljoin, urlparse
    soup = BeautifulSoup(html, "html.parser")
    career_keywords = ["job", "career", "search", "position", "opening", "hiring", "apply", "recruit"]
    
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(strip=True).lower()
        full_url = urljoin(base_url, href)
        
        # Only keep links that look career-related
        combined = (href + " " + text).lower()
        if any(kw in combined for kw in career_keywords):
            if full_url.startswith("http"):
                links.append(full_url)

    # Deduplicate, keep first 20
    seen = set()
    result = []
    for l in links:
        if l not in seen:
            seen.add(l)
            result.append(l)
    return result[:20]


def jobs_url_finder_node(state: SearchState, groq_api_key: str) -> dict:
    url = state["careers_url"]
    domain = _get_domain(url)

    # Check known overrides first — no LLM needed
    for known_domain, override_url in KNOWN_SEARCH_URLS.items():
        if known_domain in domain and override_url:
            logger.info(f"Using known search URL for {domain}: {override_url}")
            return {"careers_url": override_url}

    # Fetch the page
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        html = resp.text
    except Exception as e:
        logger.warning(f"Could not fetch {url}: {e}")
        return {"careers_url": url}  # Fall through with original URL

    # Check if the page already has job listings (good text density)
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(strip=True)
    
    # Heuristic: if page has "apply" or "job description" it's probably already a listing page
    listing_signals = ["apply now", "job description", "responsibilities", "qualifications", "years of experience"]
    if any(sig in text.lower() for sig in listing_signals):
        logger.info(f"Input URL already looks like a job listing page: {url}")
        return {"careers_url": url}

    # Extract career-related links and ask LLM to pick the best one
    links = _extract_career_links(html, url)
    text_preview = text[:500]

    if not links:
        logger.info(f"No career links found on {url}, using as-is")
        return {"careers_url": url}

    llm = get_fast_llm(groq_api_key)
    prompt = PROMPT_TEMPLATE.format(
        url=url,
        links="\n".join(links),
        text_preview=text_preview,
    )
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]

    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
        raw = re.sub(r",\s*([}\]])", r"\1", raw)
        result = json.loads(raw)
        best_url = result.get("best_search_url", url)
        logger.info(f"Jobs URL finder chose: {best_url} (confidence: {result.get('confidence')})")
        return {"careers_url": best_url}
    except Exception as e:
        logger.warning(f"Jobs URL finder LLM failed: {e}, using original URL")
        return {"careers_url": url}
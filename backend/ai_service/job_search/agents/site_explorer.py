#AI node: fetches page, understands search mechanism & pagination
"""
Search Agent 1 — Site Explorer
Fetches the careers page and uses LLM to understand:
- How search works (URL params, form, no search at all)
- Whether JS rendering is needed
- General site structure observations
Runs ONCE per site, result is saved into recipe.
"""
import re
import json
import logging
import requests
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from job_search.state import SearchState

logger = logging.getLogger(__name__)

# Import the same LLM factory your project already uses
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from llm import get_fast_llm

SYSTEM = """You are an expert web scraping analyst. 
Your job is to analyze careers/jobs pages and determine exactly how to scrape them programmatically.
Return ONLY valid JSON, no markdown, no explanation."""

PROMPT_TEMPLATE = """Analyze this careers page and determine how it works.

URL: {url}
PAGE TEXT (truncated):
{page_text}

Return JSON with this exact structure:
{{
  "search_mechanism": {{
    "type": "url_param" | "no_search" | "form_js" | "unknown",
    "pattern": "full URL with {{keyword}} placeholder if type is url_param, else null",
    "notes": "any observations about how search/filtering works"
  }},
  "pagination": {{
    "type": "url_param" | "next_button" | "load_more" | "none" | "unknown",
    "param": "page param name if url_param, else null",
    "start_index": 1,
    "increment": 1,
    "notes": "any observations"
  }},
  "requires_js": true | false,
  "confidence": "high" | "medium" | "low",
  "notes": "any important observations about this site"
}}

Rules:
- If you see URLs like /jobs?q=keyword or /careers?search=keyword → type is url_param
- If the page appears to be a React/Next.js SPA with no job listings in HTML → requires_js true
- If there's no search at all (just a list of jobs) → type is no_search
- Be conservative: if unsure, set requires_js true
"""


def _extract_json(raw: str) -> str:
    """
    Robustly extract the first valid JSON object from LLM output.
    Handles: markdown fences, trailing text, comments, trailing commas.
    """
    # Strip markdown fences
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    # Remove JS-style // comments
    raw = re.sub(r"//[^\n]*\n", "\n", raw)

    # Remove trailing commas before } or ]
    raw = re.sub(r",\s*([}\]])", r"\1", raw)

    # Extract just the first { ... } block (ignore anything after)
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

    return raw  # fallback: return as-is and let json.loads fail naturally


def _is_js_shell(html: str) -> bool:
    """
    Detect if the page needs JS rendering to show job listings.
    A page can have lots of text (nav, footer, boilerplate) but zero job content.
    We check for signals that actual job listings are present.
    """
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(strip=True).lower()

    # Hard shell: very little text at all
    if len(text) < 500:
        return True

    # Soft shell: page has text but no job listing signals
    # If none of these appear, it's probably a shell waiting for JS to inject jobs
    job_signals = [
        "job description", "responsibilities", "qualifications",
        "years of experience", "apply now", "full-time", "part-time",
        "software engineer", "product manager", "data scientist",
        "we are looking", "you will be", "about the role",
        "job id", "req id", "requisition",
    ]
    has_job_content = any(sig in text for sig in job_signals)

    # Also check for repeated job-card-like structures in HTML
    job_card_signals = [
        'data-job', 'job-card', 'job-listing', 'job-item',
        'jobCard', 'jobListing', 'job_card', 'job_listing',
        'search-result', 'position-card',
    ]
    has_job_html = any(sig in html for sig in job_card_signals)

    return not (has_job_content or has_job_html)


def _html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return "\n".join(lines)[:3000]


def _fetch_with_requests(url: str) -> tuple[str, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        return resp.text, _html_to_text(resp.text)
    except Exception as e:
        return "", f"Failed to fetch page: {e}"


def _fetch_with_playwright(url: str) -> tuple[str, str]:
    """Use headless Chromium for JS-rendered pages."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
            })
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

            # Wait for any of these job-related selectors to appear
            # Try each one — first match wins
            job_selectors = [
                "[data-ph-at-id='job-link']",   # Microsoft specific
                ".ms-List-cell",                 # Microsoft Fluent UI list
                "[class*='jobCard']",
                "[class*='job-card']",
                "[class*='job-listing']",
                "[class*='search-result']",
                "li[class*='job']",
                "article[class*='job']",
            ]
            for sel in job_selectors:
                try:
                    page.wait_for_selector(sel, timeout=8000)
                    logger.info(f"Job content found with selector: {sel}")
                    break
                except Exception:
                    continue
            else:
                # No specific selector found — just wait a bit longer
                page.wait_for_timeout(5000)

            html = page.content()
            browser.close()

        logger.info(f"Playwright fetched {len(html)} bytes from {url}")
        return html, _html_to_text(html)
    except Exception as e:
        logger.error(f"Playwright failed for {url}: {e}")
        return "", f"Playwright failed: {e}"


def _fetch_page(url: str) -> tuple[str, str]:
    """Try requests first (fast). If page is a JS shell, fall back to Playwright."""
    html, text = _fetch_with_requests(url)
    if html and _is_js_shell(html):
        logger.info(f"JS shell detected for {url}, retrying with Playwright...")
        pw_html, pw_text = _fetch_with_playwright(url)
        if pw_html:
            return pw_html, pw_text
    return html, text



def site_explorer_node(state: SearchState, groq_api_key: str) -> dict:
    llm = get_fast_llm(groq_api_key)

    url = state["careers_url"]
    html, page_text = _fetch_page(url)

    if not html:
        return {
            "page_html": "",
            "page_text": page_text,
            "site_structure": {"error": page_text},
            "error": page_text,
        }

    prompt = PROMPT_TEMPLATE.format(url=url, page_text=page_text)
    messages = [SystemMessage(content=SYSTEM), HumanMessage(content=prompt)]

    try:
        response = llm.invoke(messages)
        raw = response.content.strip()
        site_structure = json.loads(_extract_json(raw))
    except Exception as e:
        site_structure = {
            "search_mechanism": {"type": "unknown", "pattern": None, "notes": str(e)},
            "pagination": {"type": "unknown", "param": None, "start_index": 1, "increment": 1, "notes": ""},
            "requires_js": True,
            "confidence": "low",
            "notes": f"Explorer failed: {e}",
        }

    return {
        "page_html": html,
        "page_text": page_text,
        "site_structure": site_structure,
    }
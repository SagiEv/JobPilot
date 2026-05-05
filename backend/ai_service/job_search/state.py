"""
State for the Job Search feature.
Completely separate from TailoringState — no coupling to CV pipeline.
"""
from typing import TypedDict, Optional, List, Dict, Any


class SiteRecipe(TypedDict):
    """
    Saved once per company site. Used by the dumb scraper forever after.
    """
    company: str
    careers_url: str
    last_analyzed: str                  # ISO date string
    failure_count: int

    search_mechanism: Dict[str, Any]
    # Examples:
    # {"type": "url_param", "pattern": "https://example.com/jobs?q={keyword}"}
    # {"type": "no_search", "note": "scrape all jobs and filter locally"}
    # {"type": "form", "note": "requires JS interaction — use playwright"}

    pagination: Dict[str, Any]
    # Examples:
    # {"type": "url_param", "param": "page", "start": 1, "increment": 1}
    # {"type": "next_button", "selector": "a.next-page"}
    # {"type": "none"}

    selectors: Dict[str, str]
    # CSS selectors for parsing job listings:
    # {"job_container": ".job-card", "title": "h3.title", "location": ".location",
    #  "link": "a[href]", "description_snippet": ".summary"}

    requires_js: bool                   # True = use Playwright, False = requests
    notes: str                          # AI observations about the site


class SearchState(TypedDict):
    # ── Inputs ────────────────────────────────────────────────────────
    careers_url: str
    company: str
    groq_api_key: str

    # ── Intermediate (AI analysis phase) ──────────────────────────────
    page_html: str                      # Raw HTML fetched from careers page
    page_text: str                      # Cleaned text version
    site_structure: Dict[str, Any]      # site_explorer output
    extracted_selectors: Dict[str, Any] # selector_extractor output
    validation_result: Dict[str, Any]   # recipe_validator output

    # ── Output ────────────────────────────────────────────────────────
    recipe: Optional[SiteRecipe]
    error: Optional[str]
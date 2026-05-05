#Zero AI daily runner — uses saved recipe, handles pagination + filtering
"""
job_search/scraper/dumb_scraper.py
Zero AI. Runs daily. Uses saved SiteRecipe to scrape jobs.
Handles: url_param search, pagination, keyword/anti-keyword filtering.
Falls back to Playwright if requires_js is True (optional dependency).
"""
import time
import requests
import logging
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import urljoin, urlparse
from job_search.state import SiteRecipe

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}
REQUEST_DELAY_SECONDS = 1.5   # Be polite
MAX_PAGES = 20                 # Hard cap — never scrape more than this


class DumbScraper:
    """
    Executes a SiteRecipe to extract jobs.
    No LLM calls. No AI. Just requests + BeautifulSoup.
    """

    def __init__(self, recipe: SiteRecipe):
        self.recipe = recipe
        self.base_url = recipe["careers_url"]

    # ── Public entry point ────────────────────────────────────────────

    def scrape(
        self,
        keywords: list[str],
        anti_keywords: list[str],
    ) -> dict:
        """
        Main method. Returns:
        {
            "company": str,
            "jobs": [ {title, location, link, description_snippet} ],
            "total_scraped": int,
            "total_after_filter": int,
            "error": str | None
        }
        """
        search_type = self.recipe["search_mechanism"].get("type", "unknown")

        try:
            if search_type == "url_param" and keywords:
                raw_jobs = self._scrape_with_search(keywords)
            else:
                # Scrape all, filter locally
                raw_jobs = self._scrape_all_pages()

            filtered = self._filter(raw_jobs, keywords, anti_keywords)

            return {
                "company": self.recipe["company"],
                "jobs": filtered,
                "total_scraped": len(raw_jobs),
                "total_after_filter": len(filtered),
                "error": None,
            }
        except Exception as e:
            logger.error(f"[{self.recipe['company']}] Scraper error: {e}")
            return {
                "company": self.recipe["company"],
                "jobs": [],
                "total_scraped": 0,
                "total_after_filter": 0,
                "error": str(e),
            }

    # ── Scraping strategies ───────────────────────────────────────────

    def _scrape_with_search(self, keywords: list[str]) -> list[dict]:
        """Use URL pattern search for each keyword, deduplicate by link."""
        pattern = self.recipe["search_mechanism"].get("pattern", "")
        all_jobs = {}  # link → job dict (dedup)

        for kw in keywords:
            search_url = pattern.replace("{keyword}", kw)
            jobs = self._scrape_all_pages(start_url=search_url)
            for job in jobs:
                link = job.get("link", "")
                if link:
                    all_jobs[link] = job

        return list(all_jobs.values())

    def _scrape_all_pages(self, start_url: Optional[str] = None) -> list[dict]:
        """Paginate through all pages and collect raw jobs."""
        url = start_url or self.base_url
        pagination = self.recipe["pagination"]
        pag_type = pagination.get("type", "none")

        all_jobs = []

        if pag_type == "url_param":
            param = pagination.get("param", "page")
            start = pagination.get("start_index", 1)
            increment = pagination.get("increment", 1)

            for page_num in range(MAX_PAGES):
                page_idx = start + (page_num * increment)
                sep = "&" if "?" in url else "?"
                page_url = f"{url}{sep}{param}={page_idx}"

                jobs = self._extract_jobs_from_url(page_url)
                if not jobs:
                    break  # No more results

                all_jobs.extend(jobs)
                time.sleep(REQUEST_DELAY_SECONDS)

        elif pag_type == "next_button":
            current_url = url
            for _ in range(MAX_PAGES):
                html = self._fetch_html(current_url)
                if not html:
                    break

                jobs = self._extract_jobs_from_html(html)
                all_jobs.extend(jobs)

                # Find next page link
                soup = BeautifulSoup(html, "html.parser")
                next_sel = self.recipe["pagination"].get("selector", "a[aria-label='Next']")
                next_el = soup.select_one(next_sel)
                if not next_el or not next_el.get("href"):
                    break

                next_href = next_el["href"]
                current_url = urljoin(current_url, next_href)
                time.sleep(REQUEST_DELAY_SECONDS)

        else:
            # No pagination or unknown — just scrape the single page
            all_jobs = self._extract_jobs_from_url(url)

        return all_jobs

    # ── Per-page extraction ───────────────────────────────────────────

    def _extract_jobs_from_url(self, url: str) -> list[dict]:
        html = self._fetch_html(url)
        if not html:
            return []
        return self._extract_jobs_from_html(html)

    def _extract_jobs_from_html(self, html: str) -> list[dict]:
        selectors = self.recipe["selectors"]
        soup = BeautifulSoup(html, "html.parser")

        container_sel = selectors.get("job_container")
        if not container_sel:
            return []

        # Check no-results indicator first
        no_results_sel = selectors.get("no_results_indicator")
        if no_results_sel and soup.select_one(no_results_sel):
            return []

        containers = soup.select(container_sel)
        jobs = []

        for el in containers:
            job = {"company": self.recipe["company"]}

            # Title
            title_sel = selectors.get("title")
            if title_sel:
                t = el.select_one(title_sel)
                job["title"] = t.get_text(strip=True) if t else ""

            # Location
            loc_sel = selectors.get("location")
            if loc_sel:
                l = el.select_one(loc_sel)
                job["location"] = l.get_text(strip=True) if l else ""

            # Link
            link_sel = selectors.get("link", "a[href]")
            lnk = el.select_one(link_sel)
            if lnk:
                href = lnk.get("href", "")
                job["link"] = urljoin(self.base_url, href) if href else ""
            else:
                job["link"] = ""

            # Description snippet
            desc_sel = selectors.get("description_snippet")
            if desc_sel:
                d = el.select_one(desc_sel)
                job["description_snippet"] = d.get_text(strip=True)[:300] if d else ""

            # Only add if we got at least a title or link
            if job.get("title") or job.get("link"):
                jobs.append(job)

        return jobs

    # ── Filtering ─────────────────────────────────────────────────────

    def _filter(
        self,
        jobs: list[dict],
        keywords: list[str],
        anti_keywords: list[str],
    ) -> list[dict]:
        """
        Keep jobs that match at least one keyword (if keywords provided)
        and contain none of the anti_keywords.
        Matching is case-insensitive on title + description_snippet.
        """
        result = []
        for job in jobs:
            text = (
                (job.get("title") or "") + " " +
                (job.get("description_snippet") or "")
            ).lower()

            # Anti-keyword check — skip if any anti-keyword found
            if any(ak.lower() in text for ak in anti_keywords):
                continue

            # Keyword check — must match at least one (if keywords given)
            if keywords:
                if not any(kw.lower() in text for kw in keywords):
                    continue

            result.append(job)

        return result

    # ── HTTP ─────────────────────────────────────────────────────────

    def _fetch_html(self, url: str) -> Optional[str]:
        try:
            resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None
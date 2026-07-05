from typing import TypedDict, Optional, List, Dict, Any


class TailoringState(TypedDict):
    # ── Inputs ────────────────────────────────────────────────────────
    job_description_raw: str
    base_cv: str                     # profile.cv  (HTML/plain text)
    cv_data: Dict[str, Any]          # profile.cv_data (structured JSONB)
    skills_pool: List[Dict]          # skills table rows
    projects_pool: List[Dict]        # projects table rows
    experience_text: str             # experience_text.text

    # ── Agent outputs (built up incrementally) ────────────────────────
    job_analysis: Dict[str, Any]     # Job Analyst
    cv_score: Dict[str, Any]         # CV Scorer
    profile_selections: Dict[str, Any]  # Profile Selector
    keyword_injections: Dict[str, Any]  # Keyword Injector
    restructured_cv: Dict[str, Any]  # CV Restructurer
    ats_result: Dict[str, Any]       # ATS Validator
    ats_retry_count: int             # Loop guard
    rewritten_summary: str           # Summary Rewriter
    polish_notes: str                # Final Polish — internal notes

    # ── Final outputs ─────────────────────────────────────────────────
    tailored_cv_markdown: str        # Full tailored CV in Markdown
    tailoring_report: Dict[str, Any] # What changed + grades
    projected_score: float
    error: Optional[str]             # Set if any agent fails hard

from pydantic import BaseModel
from typing import Optional, List, Dict

class AnalyzeSiteRequest(BaseModel):
    """
    Trigger AI analysis for one careers page.
    Saves a recipe to disk. Call once per new company.
    Subsequent /search/run calls will use the saved recipe.
    """
    careers_url: str
    company: str
    groq_api_key: str
    force_reanalyze: bool = False

class SearchRequest(BaseModel):
    """
    Daily scrape request. Pass a list of companies to search.
    AI is NOT invoked unless a site has no saved recipe yet.
    """
    companies: List[Dict[str, str]]  # [{"careers_url": "...", "company": "..."}]
    keywords: List[str]
    anti_keywords: Optional[List[str]] = []
    groq_api_key: str                # Only used if a new site needs AI analysis

class JobClassificationRequest(BaseModel):
    title: str
    company: str
    location: str
    url: str
    description: str
    groq_api_key: str

class JobClassificationResponse(BaseModel):
    is_relevant: bool
    category: Optional[str] = None
    seniority: Optional[str] = None
    reason: Optional[str] = None

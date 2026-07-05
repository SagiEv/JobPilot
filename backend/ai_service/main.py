from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from state import TailoringState
from graph import build_graph

# ── Job Search imports ────────────────────────────────────────────────
from job_search.graph import build_search_analyzer_graph
from job_search.scraper.dumb_scraper import DumbScraper
from recipe_store import load_recipe, save_recipe, increment_failure, list_recipes, delete_recipe

import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="JobPilot AI Tailoring Microservice")

class TailorRequest(BaseModel):
    job_description: str
    groq_api_key: str
    base_cv: Optional[str] = ""
    cv_data: Optional[Dict[str, Any]] = {}
    skills_pool: Optional[List[Dict[str, Any]]] = []
    projects_pool: Optional[List[Dict[str, Any]]] = []
    experience_text: Optional[str] = ""
    mode: Optional[str] = "full"  # "quick" or "full"

@app.post("/tailor")
async def tailor_cv(payload: TailorRequest):
    if not payload.job_description or not payload.groq_api_key:
        raise HTTPException(status_code=400, detail="Missing job_description or groq_api_key")

    try:
        graph = build_graph(payload.groq_api_key)
        
        initial_state = {
            "job_description_raw": payload.job_description,
            "base_cv": payload.base_cv,
            "cv_data": payload.cv_data,
            "skills_pool": payload.skills_pool,
            "projects_pool": payload.projects_pool,
            "experience_text": payload.experience_text,
            "ats_retry_count": 0,
        }

        # Run the graph
        logger.info("Starting AI tailoring pipeline...")
        result_state = graph.invoke(initial_state)
        
        logger.info("Pipeline complete.")
        return {
            "success": True,
            "tailored_cv": result_state.get("tailored_cv_markdown", ""),
            "overall_score": result_state.get("cv_score", {}).get("overall_score", 0),
            "projected_score": result_state.get("projected_score", 0),
            "tailoring_report": result_state.get("tailoring_report", {}),
        }
    except Exception as e:
        logger.error(f"Error in pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ════════════════════════════════════════════════════════════════════
#  NEW — Job Search
# ════════════════════════════════════════════════════════════════════
 
class AnalyzeSiteRequest(BaseModel):
    """
    Trigger AI analysis for one careers page.
    Saves a recipe to disk. Call once per new company.
    Subsequent /search/run calls will use the saved recipe.
    """
    careers_url: str
    company: str
    groq_api_key: str
    force_reanalyze: bool = False   # True = delete existing recipe and re-run AI
 
 
class SearchRequest(BaseModel):
    """
    Daily scrape request. Pass a list of companies to search.
    AI is NOT invoked unless a site has no saved recipe yet.
    """
    companies: List[Dict[str, str]]  # [{"careers_url": "...", "company": "..."}]
    keywords: List[str]
    anti_keywords: Optional[List[str]] = []
    groq_api_key: str                # Only used if a new site needs AI analysis
 
 
@app.post("/search/analyze-site")
async def analyze_site(payload: AnalyzeSiteRequest):
    """
    Run the AI analysis pipeline for one careers site.
    Saves a reusable recipe. Typically called once per new company.
    Returns the generated recipe so you can inspect/verify it.
    """
    if payload.force_reanalyze:
        delete_recipe(payload.careers_url)
        logger.info(f"Forced re-analysis for {payload.company}")
 
    # Check if recipe already exists and is fresh
    existing = load_recipe(payload.careers_url)
    if existing:
        return {
            "success": True,
            "recipe": existing,
            "from_cache": True,
            "message": "Recipe already exists and is fresh. Use force_reanalyze=true to re-run.",
        }
 
    try:
        graph = build_search_analyzer_graph(payload.groq_api_key)
        logger.info(f"Analyzing site: {payload.careers_url}")
 
        initial_state = {
            "careers_url": payload.careers_url,
            "company": payload.company,
            "groq_api_key": payload.groq_api_key,
            "page_html": "",
            "page_text": "",
        }
 
        result = graph.invoke(initial_state)
 
        if result.get("error"):
            raise Exception(result["error"])
 
        recipe = result.get("recipe")
        if not recipe:
            raise Exception("Analysis completed but no recipe was generated")
 
        save_recipe(recipe)
        logger.info(f"Recipe saved for {payload.company}")
 
        return {
            "success": True,
            "recipe": recipe,
            "from_cache": False,
            "validation": result.get("validation_result", {}),
        }
 
    except Exception as e:
        logger.error(f"Site analysis failed for {payload.careers_url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
 
 
@app.post("/search/run")
async def run_search(payload: SearchRequest):
    """
    Daily job search across multiple companies.
    - If a recipe exists → dumb scraper runs (zero AI)
    - If no recipe → AI analysis runs first, then scrapes
    Returns all matching jobs across all companies.
    """
    if not payload.keywords and not payload.companies:
        raise HTTPException(status_code=400, detail="Provide at least keywords and companies")
 
    all_results = []
    newly_analyzed = []
    failed = []
 
    for company_entry in payload.companies:
        url = company_entry.get("careers_url", "")
        company = company_entry.get("company", url)
 
        if not url:
            continue
 
        # Step 1: Get or create recipe
        recipe = load_recipe(url)
 
        if not recipe:
            # No fresh recipe — run AI analysis first
            if not payload.groq_api_key:
                failed.append({"company": company, "error": "No recipe and no groq_api_key for analysis"})
                continue
 
            logger.info(f"No recipe for {company} — running AI analysis...")
            try:
                graph = build_search_analyzer_graph(payload.groq_api_key)
                initial_state = {
                    "careers_url": url,
                    "company": company,
                    "groq_api_key": payload.groq_api_key,
                    "page_html": "",
                    "page_text": "",
                }
                result = graph.invoke(initial_state)
                recipe = result.get("recipe")
                if recipe:
                    save_recipe(recipe)
                    newly_analyzed.append(company)
                    logger.info(f"Recipe created for {company}")
                else:
                    raise Exception("Graph returned no recipe")
            except Exception as e:
                logger.error(f"Analysis failed for {company}: {e}")
                failed.append({"company": company, "error": f"AI analysis failed: {str(e)}"})
                continue
 
        # Step 2: Dumb scraper — zero AI
        logger.info(f"Scraping {company} (requires_js={recipe.get('requires_js')})")
        scraper = DumbScraper(recipe)
        result = scraper.scrape(
            keywords=payload.keywords,
            anti_keywords=payload.anti_keywords or [],
        )
 
        # Track failures for recipe invalidation
        if result.get("error"):
            count = increment_failure(url)
            logger.warning(f"{company} scrape failed (failure #{count}): {result['error']}")
            failed.append({"company": company, "error": result["error"]})
        else:
            all_results.append(result)
 
    # Flatten all jobs into a single list
    all_jobs = []
    for r in all_results:
        all_jobs.extend(r.get("jobs", []))
 
    return {
        "success": True,
        "total_jobs": len(all_jobs),
        "jobs": all_jobs,
        "per_company": [
            {
                "company": r["company"],
                "found": r["total_after_filter"],
                "scraped": r["total_scraped"],
            }
            for r in all_results
        ],
        "newly_analyzed": newly_analyzed,
        "failed": failed,
    }
 
 
# ── Recipe management endpoints ────────────────────────────────────
 
@app.post("/search/debug-fetch")
async def debug_fetch(payload: AnalyzeSiteRequest):
    """
    Debug endpoint — shows exactly what the site explorer fetches.
    Use to diagnose recipe failures.
    """
    from job_search.agents.site_explorer import (
        _fetch_with_requests, _fetch_with_playwright, _is_js_shell, _html_to_text
    )
    from bs4 import BeautifulSoup
 
    url = payload.careers_url
 
    # Step 1: requests
    html_req, text_req = _fetch_with_requests(url)
    is_shell = _is_js_shell(html_req) if html_req else True
 
    result = {
        "url": url,
        "requests": {
            "html_length": len(html_req),
            "text_length": len(text_req),
            "is_js_shell": is_shell,
            "text_preview": text_req[:500],
        },
        "playwright": None,
    }
 
    # Step 2: Playwright if shell detected
    if is_shell:
        html_pw, text_pw = _fetch_with_playwright(url)
        result["playwright"] = {
            "html_length": len(html_pw),
            "text_length": len(text_pw),
            "is_js_shell_after": _is_js_shell(html_pw) if html_pw else True,
            "text_preview": text_pw[:800],
            "error": text_pw if not html_pw else None,
        }
 
    return result
 
 
@app.get("/search/recipes")
def get_recipes():
    """List all saved recipes and their status."""
    return {"recipes": list_recipes()}
 
 
@app.delete("/search/recipes/{company_domain}")
def invalidate_recipe(company_domain: str):
    """Force re-analysis of a site next time it's scraped."""
    from recipe_store import RECIPES_DIR
    path = os.path.join(RECIPES_DIR, f"{company_domain}.json")
    if os.path.exists(path):
        os.remove(path)
        return {"success": True, "message": f"Recipe {company_domain} deleted"}
    return {"success": False, "message": "Recipe not found"}
 

class MessageRequest(BaseModel):
    purpose: str
    job_link: Optional[str] = ""
    description: Optional[str] = ""
    addressee_name: Optional[str] = ""
    cv_text: Optional[str] = ""
    github_portfolio: Optional[str] = ""
    recipient_email: Optional[str] = ""
    language: Optional[str] = "En"
    skills_pool: Optional[List[Dict[str, Any]]] = []
    projects_pool: Optional[List[Dict[str, Any]]] = []
    experience_text: Optional[str] = ""
    groq_api_key: str

@app.post("/generate-message")
async def generate_message(payload: MessageRequest):
    if not payload.groq_api_key:
        raise HTTPException(status_code=400, detail="Missing groq_api_key")
    
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatGroq(temperature=0.7, groq_api_key=payload.groq_api_key, model_name="llama-3.1-8b-instant")

        language_instruction = "The output MUST be written entirely in English."
        if payload.language == "He":
            language_instruction = "The output MUST be written entirely in Hebrew."

        recipient_info = f"Recipient Email: {payload.recipient_email}" if payload.recipient_email else ""

        user_data_context = f"""
        My Skills: {payload.skills_pool}
        My Projects: {payload.projects_pool}
        My Experience: {payload.experience_text}
        """

        if payload.purpose == "referral":
            system_prompt = f"You are an expert career coach helping a user write an email or message asking for a job referral. {language_instruction}"
            user_prompt = f"""
            Please write a short, professional, and engaging message to {payload.addressee_name or 'a connection'}.
            {recipient_info}
            I am asking for a referral for a job.
            Job Link: {payload.job_link}
            Job Description: {payload.description}
            My GitHub Portfolio: {payload.github_portfolio}
            My CV Summary: {payload.cv_text[:500] if payload.cv_text else ''}
            
            {user_data_context}
            
            Keep it under 150 words. Be polite, direct, and highlight one key strength if possible. Based on my data, please include a brief sentence explaining why I am a strong fit for this job.
            """
        else:
            system_prompt = f"You are an expert career coach helping a user write a cold email or direct message to a recruiter applying for a job. {language_instruction}"
            user_prompt = f"""
            Please write a short, professional, and engaging message to {payload.addressee_name or 'the hiring team'}.
            {recipient_info}
            I am applying for a job.
            Job Link: {payload.job_link}
            Job Description: {payload.description}
            My GitHub Portfolio: {payload.github_portfolio}
            My CV Summary: {payload.cv_text[:500] if payload.cv_text else ''}
            
            {user_data_context}
            
            Keep it under 150 words. Emphasize excitement about the role and a brief match of skills. Based on my data, please include a brief sentence explaining why I am a strong fit for this job.
            """

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = llm.invoke(messages)
        return {
            "success": True,
            "message": response.content
        }
    except Exception as e:
        logger.error(f"Error generating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "jobpilot-ai"}

if __name__ == "__main__":
    import uvicorn
    # Run the fast api service on port 8001
    uvicorn.run(app, host="127.0.0.1", port=8001)

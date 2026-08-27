from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TailorRequest(BaseModel):
    job_description: str
    api_keys: Dict[str, Optional[str]] = {}
    provider: Optional[str] = "groq"
    model: Optional[str] = None
    base_cv: Optional[str] = ""
    cv_data: Optional[Dict[str, Any]] = {}
    skills_pool: Optional[List[Dict[str, Any]]] = []
    projects_pool: Optional[List[Dict[str, Any]]] = []
    experience_text: Optional[str] = ""
    mode: Optional[str] = "full"  # "quick" or "full"

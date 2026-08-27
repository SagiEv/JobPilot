from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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
    api_keys: Dict[str, Optional[str]] = {}
    provider: Optional[str] = "groq"
    model: Optional[str] = None

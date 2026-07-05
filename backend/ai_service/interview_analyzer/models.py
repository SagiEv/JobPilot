from pydantic import BaseModel
from typing import List, Dict, Any

class InterviewAnalysisRequest(BaseModel):
    groq_api_key: str
    interviews_data: List[Dict[str, Any]]

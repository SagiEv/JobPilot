from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class InterviewAnalysisRequest(BaseModel):
    api_keys: Dict[str, Optional[str]] = {}
    provider: Optional[str] = "groq"
    model: Optional[str] = None
    interviews_data: List[Dict[str, Any]]

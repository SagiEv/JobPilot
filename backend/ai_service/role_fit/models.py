from pydantic import BaseModel, Field

class FitAnalysisRequest(BaseModel):
    job_description: str
    candidate_data: dict
    api_keys: dict
    provider: str = "groq"

class FitAnalysisResponse(BaseModel):
    ai_score: int = Field(description="Score from 0 to 100 representing the fit.")
    short_summary: str = Field(description="A concise 1-2 sentence explanation of the fit.")
    percentage_matches: dict = Field(description="Dictionary with match percentages, e.g., {'Skills Match': '80%', 'Experience Match': '60%'}")

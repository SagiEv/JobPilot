from pydantic import BaseModel, Field
from typing import List, Optional

class TailoringReport(BaseModel):
    job_title: str
    seniority: str
    industry: str
    added_skills: List[str]
    missing_skills: List[str]
    ats_keywords_injected: List[str]

class CVScore(BaseModel):
    overall_score: int
    matching_skills: int
    missing_skills: int
    experience_relevance: int
    readability: int

class SingleShotResult(BaseModel):
    tailored_cv_markdown: str = Field(description="The fully tailored CV formatted in clean Markdown")
    cv_score: CVScore = Field(description="Score of the original CV against the job description")
    projected_score: int = Field(description="Expected score of the newly tailored CV against the job description (0-100)")
    tailoring_report: TailoringReport = Field(description="Report detailing the changes and analysis")

from fastapi import APIRouter, HTTPException
import json
from langchain_core.prompts import ChatPromptTemplate
from role_fit.models import FitAnalysisRequest, FitAnalysisResponse
from llm import get_fast_llm

router = APIRouter(prefix="/role-fit", tags=["Role Fit Analysis"])

PROMPT_TEMPLATE = """
You are an expert technical recruiter analyzing how well a candidate fits a job description.

Job Description:
{job_description}

Candidate Data:
{candidate_data}

Evaluate the candidate based on:
1. Skills required vs skills possessed.
2. Experience required vs experience possessed.
3. Role seniority alignment.
4. General tech stack similarity.

Provide a short, concise summary of the fit. Do not invent experience or skills.

Return the result matching this JSON structure:
- ai_score: Integer from 0 to 100.
- short_summary: A 1-2 sentence explanation.
- percentage_matches: A dictionary showing percentage fits like {{"Skills Match": "80%", "Experience Match": "60%"}}.
"""

@router.post("/analyze", response_model=FitAnalysisResponse)
async def analyze_fit(request: FitAnalysisRequest):
    try:
        llm = get_fast_llm(request.api_keys, request.provider)
        
        # We use structured output to guarantee JSON format
        structured_llm = llm.with_structured_output(FitAnalysisResponse)
        
        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
        
        chain = prompt | structured_llm
        
        result = chain.invoke({
            "job_description": request.job_description,
            "candidate_data": json.dumps(request.candidate_data)
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

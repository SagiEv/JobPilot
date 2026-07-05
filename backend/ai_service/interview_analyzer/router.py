from fastapi import APIRouter, HTTPException
import logging
from .models import InterviewAnalysisRequest
from .service import analyze_interview_feedback

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze-interviews")
async def analyze_interviews(payload: InterviewAnalysisRequest):
    if not payload.groq_api_key:
        raise HTTPException(status_code=400, detail="Missing groq_api_key")
    
    try:
        report = await analyze_interview_feedback(payload)
        return {
            "success": True,
            "report": report
        }
    except Exception as e:
        logger.error(f"Error analyzing interviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))

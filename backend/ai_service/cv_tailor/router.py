from fastapi import APIRouter, HTTPException
import logging
from .models import TailorRequest
from .graph import build_graph

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/tailor")
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

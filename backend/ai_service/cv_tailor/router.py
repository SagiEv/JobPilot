from fastapi import APIRouter, HTTPException
import logging
from .models import TailorRequest
from .graph import build_graph
from .agents.single_shot_tailor import single_shot_tailor_node

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/tailor")
async def tailor_cv(payload: TailorRequest):
    if not payload.job_description:
        raise HTTPException(status_code=400, detail="Missing job_description")

    try:
        if payload.pipeline_mode.lower() == "fast":
            logger.info(f"Starting Single-Shot AI tailoring pipeline (Fast Mode with {payload.provider})...")
            return single_shot_tailor_node(payload, payload.api_keys, payload.provider, payload.model)

        graph = build_graph(payload.api_keys, payload.provider, payload.model)
        
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
    except HTTPException as he:
        # Propagate rate limit and other HTTP exceptions directly
        raise he
    except Exception as e:
        logger.error(f"Error in pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

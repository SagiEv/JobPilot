from fastapi import APIRouter, HTTPException
import logging
from .models import MessageRequest
from .service import generate_networking_message

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/generate-message")
async def generate_message(payload: MessageRequest):
    if not payload.groq_api_key:
        raise HTTPException(status_code=400, detail="Missing groq_api_key")
    
    try:
        message = await generate_networking_message(payload)
        return {
            "success": True,
            "message": message
        }
    except Exception as e:
        logger.error(f"Error generating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

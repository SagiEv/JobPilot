from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Try loading the model globally
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    logger.error(f"Failed to load sentence-transformers: {e}")
    model = None

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

@router.post("/embed", response_model=EmbedResponse)
def generate_embedding(request: EmbedRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Embedding model not loaded")
    
    try:
        # Encode returns a numpy array, convert to list of floats
        vector = model.encode(request.text).tolist()
        return {"embedding": vector}
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

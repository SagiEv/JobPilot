from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Lazy-load the model on first /embed request so startup does not block Uvicorn binding
class _LazySentenceTransformer:
    def __init__(self, model_name: str):
        self._model_name = model_name
        self._instance = None

    def encode(self, *args, **kwargs):
        if self._instance is None:
            from sentence_transformers import SentenceTransformer
            self._instance = SentenceTransformer(self._model_name)
        return self._instance.encode(*args, **kwargs)

model = _LazySentenceTransformer('all-MiniLM-L6-v2')

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

from fastapi import FastAPI
import logging

from cv_tailor.router import router as tailor_router
from job_search.router import router as search_router
from message_creator.router import router as message_router
from interview_analyzer.router import router as interview_router
from embed_router import router as embed_router
from role_fit.router import router as fit_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="JobPilot AI Microservice")

# Include feature routers
app.include_router(tailor_router, tags=["CV Tailor"])
app.include_router(search_router, tags=["Job Search"])
app.include_router(message_router, tags=["Networking Message Creator"])
app.include_router(interview_router, tags=["Interview Analyzer"])
app.include_router(embed_router, tags=["Embeddings"])
app.include_router(fit_router, tags=["Role Fit Analysis"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "jobpilot-ai"}

@app.on_event("startup")
async def validate_model_registry():
    """Log the current model registry config on startup for visibility."""
    from providers.model_registry import MODEL_REGISTRY
    
    logger.info("=" * 50)
    logger.info("AI Model Registry — Current Configuration:")
    for provider, config in MODEL_REGISTRY.items():
        default = config.get("default", "N/A")
        fallbacks = ", ".join(config.get("fallbacks", []))
        available_count = len(config.get("available", []))
        logger.info(f"  [{provider}] default={default} | fallbacks=[{fallbacks}] | {available_count} models listed")
    logger.info("=" * 50)

if __name__ == "__main__":
    import uvicorn
    # Run the fast api service on port 8001
    uvicorn.run(app, host="127.0.0.1", port=8001)

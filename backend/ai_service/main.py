from fastapi import FastAPI
import logging

from cv_tailor.router import router as tailor_router
from job_search.router import router as search_router
from message_creator.router import router as message_router
from interview_analyzer.router import router as interview_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="JobPilot AI Microservice")

# Include feature routers
app.include_router(tailor_router, tags=["CV Tailor"])
app.include_router(search_router, tags=["Job Search"])
app.include_router(message_router, tags=["Networking Message Creator"])
app.include_router(interview_router, tags=["Interview Analyzer"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "jobpilot-ai"}

if __name__ == "__main__":
    import uvicorn
    # Run the fast api service on port 8001
    uvicorn.run(app, host="127.0.0.1", port=8001)

# JobPilot AI Microservice Architecture

Welcome to the **JobPilot AI Microservice**. This FastAPI application serves as the intelligence layer for the JobPilot ecosystem, interacting with LLMs (via LangChain & Groq) to automate tailoring CVs, crawling job sites, generating messages, and analyzing interviews.

## Architectural Principles
The service is built on a strictly modular, feature-based architecture. Every AI capability is isolated into its own domain package. This ensures:
1. **Separation of Concerns**: Adding or modifying a feature doesn't risk breaking unrelated endpoints.
2. **Scalability**: New AI skills can be plugged in by creating a new folder with a standard structure.
3. **Clean Entry Point**: The `main.py` file simply initializes the app and acts as a traffic controller, delegating all logic to domain-specific routers.

---

## Directory Structure

```text
backend/ai_service/
├── main.py                 # FastAPI app entry point; registers routers
├── llm.py                  # Shared LLM configuration (Fast vs. Power models)
├── requirements.txt        # Python dependencies
│
├── cv_tailor/              # 📦 AI Tailoring Pipeline
│   ├── __init__.py
│   ├── router.py           # Endpoints: POST /tailor
│   ├── graph.py            # LangGraph workflow definition
│   ├── state.py            # State management for the graph
│   ├── models.py           # Pydantic schemas (TailorRequest)
│   └── agents/             # Modular sub-agents (Scorer, Restructurer, etc.)
│
├── job_search/             # 📦 Smart Careers Crawler
│   ├── __init__.py
│   ├── router.py           # Endpoints: POST /search/run, POST /search/analyze-site, etc.
│   ├── graph.py            # LangGraph workflow for site analysis
│   ├── state.py            # State for site analysis
│   ├── models.py           # Pydantic schemas (SearchRequest)
│   ├── recipe_store.py     # Logic for saving/loading site recipes
│   ├── recipes/            # JSON files dictating how to scrape specific domains
│   ├── scraper/            # Non-AI dumb scrapers for execution speed
│   └── agents/             # Site exploration and pagination agents
│
├── message_creator/        # 📦 AI Networking Communications
│   ├── __init__.py
│   ├── router.py           # Endpoints: POST /generate-message
│   ├── service.py          # LangChain Groq prompts & invocation
│   └── models.py           # Pydantic schemas (MessageRequest)
│
└── interview_analyzer/     # 📦 Interview Insights
    ├── __init__.py
    ├── router.py           # Endpoints: POST /analyze-interviews
    ├── service.py          # Strict JSON-output LLM parsing
    └── models.py           # Pydantic schemas (InterviewAnalysisRequest)
```

## Standard Module Pattern

If you need to add a completely new feature (e.g., `cover_letter_generator`), you should follow the standard triad pattern:

1. **`models.py`**: Define your Pydantic request/response schemas here.
2. **`service.py` (or `graph.py`)**: Keep all your LangChain logic, prompts, and heavy lifting here. Avoid putting logic in the router.
3. **`router.py`**: Define the FastAPI `APIRouter()`, receive the request, pass it to your service, and return the response. Hook this router into `main.py`.

## Running the Service
To run the service locally during development:
```bash
python main.py
```
This will start the Uvicorn development server on `http://127.0.0.1:8001`.

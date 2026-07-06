### FastAPI AI Architecture
**Role:** AI CV tailoring, Agentic workflows, heavy computation, Web Scraping (Playwright), AI Job Classification/Filtering.
**Framework:** FastAPI (Uvicorn server), LangChain, LangGraph.
**Location:** `/backend/ai_service`.

### Core Components
**LLM Integration:** Groq API utilized for fast inference within LangGraph pipelines.
**Pipelines:** LangGraph used for defining stateful agent workflows (e.g., CV Tailoring). LangChain `with_structured_output` used for strict JSON extraction (e.g., Job Relevance Classification).
**Input Validation:** Pydantic schemas for request validation from Node.js.

### Execution & State
**Execution:** AI processing can be long-running. Endpoints should handle synchronous or asynchronous execution gracefully.
**Statelessness:** FastAPI endpoints themselves are stateless, but LangGraph maintains workflow state during execution.
**Scraping:** Playwright and BeautifulSoup used for automated job searches and data extraction.

### Integration
**Security:** Typically runs in an internal network, called by the Node.js backend.
**API Docs:** Auto-generated Swagger/OpenAPI available at `/docs` (Local/Dev).

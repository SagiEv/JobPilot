### Orchestrator Role
**Responsibility:** Primary API Gateway, file parsing (Multer, pdf-parse), Web Scraping (Puppeteer), standard CRUD, routing to FastAPI (AI Service).
**Framework:** Node.js / Express.
**Architecture:** MVC (`/routes`, `/controllers`, `/services`).

### Deployment & Environment
**Environment:** `.env` for secrets (Supabase keys, Frontend CORS origin, Port).
**Security:** CORS configured for the frontend origin.

### AI Service Proxying
**Routing:** Dedicated routes for AI processing (e.g., `/api/tailor/tailor-cv`, `/api/search`).
**Implementation:** Axios forwarding to the local/internal FastAPI service (`http://localhost:8000`).
**Timeout Handling:** FastAPI calls are heavy (LangGraph, Groq). Ensure Express timeout configurations account for long-running AI pipelines.

### Supabase Integration
**SDK:** `@supabase/supabase-js`.
**Auth & Data Access:** Validate requests and interact with Supabase (PostgreSQL with RLS). Service layer handles DB queries. Avoid direct DB calls in controllers.

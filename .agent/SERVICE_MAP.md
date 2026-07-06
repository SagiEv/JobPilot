### Architecture Overview
**Tier 1:** Frontend (React / Vite)
**Tier 2:** Primary Backend (Node.js / Express)
**Tier 3:** AI Logic Service (Python / FastAPI / LangGraph)
**Tier 4:** Database & Auth (Supabase PostgreSQL)

### Data Flow Map
**Client Request:** React → REST → Node.js
**Authentication:** React ↔ Supabase Auth
**Standard CRUD:** Node.js ↔ Supabase (PostgreSQL) / React ↔ Supabase (PostgreSQL)
**Heavy AI Logic (CV Tailoring):** Node.js → REST → FastAPI (LangGraph/Groq)
**Web Scraping:** Node.js (Puppeteer) or FastAPI (Playwright/BeautifulSoup)
**Background Polling (RSS/Email):** Node.js Cron → API/IMAP Fetch → Python AI Classification → DB Write

### Network Boundaries
**Frontend:** Interacts with Node.js API and Supabase directly.
**Node.js:** Orchestrator. Public API gateway. Handles file uploads (Multer) and parses them (pdf-parse) before sending to FastAPI.
**FastAPI:** Internal. Accessed primarily by Node.js for heavy AI processing tasks.
**Supabase:** External DB/Auth SaaS. Accessed by React (Auth/Data), Node.js (Data).

### Local Development Flow
**React:** `http://localhost:3000`
**Node.js:** `http://localhost:5000`
**FastAPI:** `http://localhost:8000`

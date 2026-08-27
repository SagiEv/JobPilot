# Backend & AI Service Architecture

This document outlines the architecture, design logic, and data flow for the JobPilot backend and AI services.

## Architecture Overview

**Tier 2: Primary Backend (Node.js / Express)**
Acts as the primary orchestrator, API gateway, and handles background workers.

**Tier 3: AI Logic Service (Python / FastAPI / LangGraph)**
Handles heavy AI computation, agentic workflows, and web scraping.

**Tier 4: Database & Auth (Supabase PostgreSQL)**
Provides external data storage and authentication.

## Data Flow Map

- **Client Request:** React → REST → Node.js
- **Authentication:** React ↔ Supabase Auth
- **Standard CRUD:** Node.js ↔ Supabase (PostgreSQL) / React ↔ Supabase (PostgreSQL)
- **Heavy AI Logic (CV Tailoring):** Node.js → REST → FastAPI (LangGraph / Multi-LLM Providers)
- **Web Scraping:** Node.js (Puppeteer) or FastAPI (Playwright / BeautifulSoup)
- **Background Polling (RSS/Email):** Node.js Cron → API/IMAP Fetch → Python AI Classification → DB Write

## Backend (Node.js) Design Logic

### Orchestrator Role
- **Responsibility:** Primary API Gateway, Background Workers (Cron), file parsing (Multer, pdf-parse), Web Scraping (Puppeteer), standard CRUD, and routing to the FastAPI AI Service.
- **Architecture:** MVC (`/routes`, `/controllers`, `/services`).

### AI Service Proxying
- **Routing:** Dedicated routes for AI processing (e.g., `/api/tailor/tailor-cv`, `/api/search`).
- **Implementation:** Axios forwarding to the local/internal FastAPI service (`http://localhost:8000`).
- **Timeout Handling:** FastAPI calls are heavy (LangGraph, LLM inference). Express timeout configurations must account for long-running AI pipelines.

### Supabase Integration
- **SDK:** `@supabase/supabase-js`.
- **Auth & Data Access:** Validate requests and interact with Supabase (PostgreSQL with RLS). The service layer handles DB queries, keeping controllers clean.
- **Admin Actions:** Uses the `adminSupabase` client (Service Role Key) to bypass RLS for automated background worker processes (e.g. RSS Polling).

### Background Workers
- **Cron Jobs:** Utilizes `node-cron` to orchestrate background tasks (e.g., IMAP polling, RSS feed ingestion) continuously alongside the main Express API.

## AI Service (Python) Design Logic

### Role & Location
- **Role:** AI CV tailoring, Agentic workflows, heavy computation, Web Scraping (Playwright), AI Job Classification/Filtering.
- **Framework:** FastAPI (Uvicorn server), LangChain, LangGraph.
- **Location:** `/backend/ai_service`.

### Core Components
- **LLM Integration:** Supports multiple LLM providers for inference within LangGraph pipelines.
- **Pipelines:** LangGraph is used for defining stateful agent workflows (e.g., CV Tailoring). LangChain `with_structured_output` is used for strict JSON extraction (e.g., Job Relevance Classification).
- **Input Validation:** Pydantic schemas are used for request validation from Node.js.

### Execution & State
- **Execution:** AI processing can be long-running. Endpoints are designed to handle synchronous or asynchronous execution gracefully.
- **Statelessness:** FastAPI endpoints themselves are stateless, while LangGraph maintains workflow state during execution.
- **Scraping:** Playwright and BeautifulSoup are used for automated job searches and data extraction.

### Integration
- **Security:** Typically runs in an internal network, called exclusively by the Node.js backend.
- **API Docs:** Auto-generated Swagger/OpenAPI documentation is available at `/docs` in the local/dev environment.

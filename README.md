# JobPilot — Career Command Center (Web App)

A full-stack web application for managing job applications, networking, automated job search, and AI-assisted CV tailoring.

## Features

- **Profile Management** — Store personal info, detailed resume data (Experience, Skills, Network), and target roles.
- **Application Tracker** — Track job applications with status, interview stages, and timeline tracking.
- **Analytics & Insights** — Gain interview insights and visualize application analytics to improve your job hunt.
- **Network Edge** — Manage professional contacts, relations, and interaction history.
- **Automated Job Search** — Configure automated searches and web scraping across job boards.
- **AI CV Tailoring** — AI-assisted resume customization using LangGraph and Groq, accepting PDF uploads or database profile data to tailor your CV to specific job descriptions.
- **Settings Management** — Secure configuration for AI engine API keys and other app settings.

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Supabase Client, Axios, React Quill
- **Backend (Node.js)**: Node.js, Express, Supabase JS, Puppeteer (Web Scraping), Multer (File Upload), pdf-parse
- **AI Service (Python)**: FastAPI, LangChain, LangGraph, Groq, Playwright, BeautifulSoup
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security, Auth)

## Project Structure

```text
JobPilot-WebApp/
├── backend/          # Node.js API server
│   ├── ai_service/   # Python FastAPI AI engine (LangGraph, Groq)
│   ├── controllers/  # Route handlers
│   ├── routes/       # Express routes
│   └── services/     # Business logic and database interactions
├── frontend/         # React + Vite application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application views (Profile, Analytics, Tailor, etc.)
│   │   ├── hooks/      # Custom React hooks (Data fetching, auth)
│   │   └── api.js      # Frontend API client
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Supabase Project (Database & Auth)
- Groq API Key (for AI features)

### Backend Setup (Node.js)

```bash
cd backend
npm install
cp .env.example .env
```
Add your Supabase credentials to `.env`:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
```

```bash
npm run dev
```
Backend runs on `http://localhost:5000`

### AI Service Setup (Python)

```bash
cd backend/ai_service
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
playwright install
```
The AI service runs on `http://localhost:8000` (started via `uvicorn main:app --reload`).

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```
Add your environment variables to `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
npm run dev
```
Frontend runs on `http://localhost:3000`

## API Endpoints

### Core (Node.js)
- `GET /api/health` — Health check
- `POST /api/csv/upload` — Upload and parse CSV file
- `POST /api/applications/save` — Save application data
- `POST /api/network/save` — Save network contacts
- `POST /api/settings` — Save user configurations (e.g., Groq API key)
- `POST /api/tailor/tailor-cv` — Trigger AI CV tailoring pipeline

### AI Service (Python)
- `POST /api/tailor` — Execute the LangGraph tailoring agent
- `POST /api/search` — Execute automated job search routines

## Development

All services support hot-reload in development mode.
You can run the frontend, Node.js backend, and Python AI service in separate terminals.

## Build

### Backend
No build needed—runs Node.js directly.

### Frontend
```bash
cd frontend
npm run build
```
Output is generated in `frontend/dist/`.

## JSON Resume CV Generation

JobPilot uses the [JSON Resume](https://jsonresume.org/) open-source ecosystem to generate professional single-page CVs in six distinct themes. The system converts your stored profile data into the official JSON Resume schema, renders it through a community theme, and exports a PDF via Puppeteer.

### Themes

| Theme ID | Style | Rendering |
|---|---|---|
| `claude` | Clean & minimal | Pure HTML/CSS (ESM) |
| `stackoverflow` | Dev community style | Svelte SSR (CJS bundle) |
| `developer-mono` | Monospace & sharp | React SSR (ESM dist) |
| `data-driven` | Bold & analytical | React SSR + styled-components |
| `architects-portfolio` | Structured & elegant | React SSR (ESM dist) |
| `sales-hunter` | Bold & persuasive | React SSR (ESM dist) |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/cv/preview-jsonresume` | Returns rendered HTML for the selected theme |
| `POST` | `/api/cv/download-jsonresume` | Returns a single-page A4 PDF (Puppeteer) |

Both endpoints accept `{ themeId }` in the request body and read the user's profile from the database via the authenticated session.

### Pipeline Architecture

```
Profile Data (personalInfo + cvData)
        ↓
jsonresume-mapper.js       ← parses Quill HTML → JSON Resume schema
        ↓
cv.jsonresume.service.js   ← loads theme, calls theme.render(resume)
        ↓
jsonresume-section-order.js ← reorders sections to canonical order
        ↓
HTML string → Puppeteer (PDF) or iframe (preview)
```

**Canonical section order:**
`Contact Info → Summary → Technical Skills → Education → Projects → Experience → Additional Information`

---

## Profile Formatting Guide

The CV parser reads your profile fields from the **Profile Page** editor (React Quill). To ensure clean, structured PDF output, follow these formatting rules per section.

### ✅ Technical Skills

Format each skill **category on its own line** (press **Enter** after each category in Quill).  
Each line must follow the pattern: `Category Name: item, item, item`

```
Programming Languages: Java, Python, JavaScript, TypeScript, C#, C++, SQL
Backend & Systems: Java Spring Boot, FastAPI, RESTful APIs, Microservices, LangChain, LangGraph
AI-Assisted Development: Claude Code, GitHub Copilot, Agentic AI workflows, Prompt Engineering
Databases & Analytics: PostgreSQL, SQLite, Supabase, data modeling
Frontend: React, HTML, CSS
Cloud & DevOps: Docker, Git/GitHub, Linux, AWS
Testing: JUnit, Mockito, Playwright, Selenium, automated testing
```

> **⚠️ Important:** If all categories are on a **single line** with no line breaks, the parser will attempt to split them but may misidentify boundaries when the last keyword of one category happens to be uppercase (e.g. `SQL` before `Backend & Systems:`). Use **Enter between categories** for guaranteed correct parsing.

---

### ✅ Education

Use **bold** for the degree title line, followed by the date range in parentheses. Add plain text lines for GPA and coursework.

```
B.Sc. Software Engineering, Ben-Gurion University (October 2021 – September 2025)
GPA: 83
Relevant Coursework: Data Structures & Algorithms, Operating Systems, Machine Learning.
Academic Highlights: Operating Systems (94), Object-Oriented Programming (89).
```

**Quill formatting:**
- First line: select degree title → click **Bold (⌘B)**; type ` (date range)` after the bold text
- Remaining lines: plain text

**Supported degree prefixes:** `B.Sc.`, `M.Sc.`, `Ph.D.`, `B.A.`, `M.A.`, `Bachelor of`, `Master of`

**Date range formats accepted:**
- `Month YYYY – Month YYYY` → e.g. `October 2021 – September 2025`
- `MM/YYYY – MM/YYYY` → e.g. `07/2017 – 03/2020`
- `YYYY – YYYY` → e.g. `2021 – 2025`

---

### ✅ Projects

Each project starts with a **bold title line** followed by the tech stack in parentheses, an optional GitHub link paragraph, and bullet points.

```
JobPilot – AI-Powered Full-Stack Platform (React, Node.js, FastAPI, LangChain)
GitHub: https://github.com/SagiEv/JobPilot/
• Developed a full-stack platform for tracking job applications and managing workflows.
• Built AI-powered resume tailoring using FastAPI and LangGraph pipelines.

SwipeLab – Gamified Research Labeling Platform (React Native, Java Spring Boot, PostgreSQL, Docker)
GitHub: https://github.com/SagiEv/SwipeLab
• Developed a collaborative image labeling system for 30+ users.
```

**Quill formatting:**
- Title: select project name → **Bold**; type ` (tech stack)` after bold text (not bolded)
- GitHub line: paste URL as plain text or use the link tool
- Bullet points: use the **Bullet List** toolbar button

**Separator between projects:** One empty line (press Enter twice after the last bullet point).

---

### ✅ Work Experience

Same pattern as Projects — bold title line with date range, followed by bullet points.

```
Military Service – Artillery Corps Combat Soldier (07/2017 – 03/2020)
• Led a 10-soldier division in high-pressure environments.
• Recognized for leadership and effective management under stress.
• Awarded "Excellent Soldier" certificate for outstanding performance.

Software Engineer – Acme Corp (01/2022 – 06/2024)
• Built microservices architecture using Java Spring Boot and PostgreSQL.
```

**Quill formatting:**
- Title: select job title/company → **Bold**; type ` (date range)` after bold text
- The dash separator between role and company must be an **em-dash** (`–`) or plain hyphen (` - `)
- Bullet points: use the **Bullet List** toolbar button

**Date range formats:** Same as Education above.

---

### ✅ Summary

Free-form paragraph text — no special formatting required. Write in plain text or use Quill's standard paragraph formatting. The parser strips all HTML and uses the plain text content.

---

### ✅ Additional Information

Format as one or more `Category: value, value` lines.

```
Languages: Hebrew (Native), English (Highly proficient)
Interests: Open-source development, competitive programming
```

Each category on its own line (press **Enter** between categories).

---

## License

ISC

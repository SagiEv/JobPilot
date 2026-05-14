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

## License

ISC

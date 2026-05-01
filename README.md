# JobPilot — Career Command Center (Web App)

A full-stack web application for managing job applications, networking, and automated job search.

## Features

- **Profile Management** — Store personal info, CV, and target roles
- **Application Tracker** — Track job applications with status and interview stages
- **Network Edge** — Manage professional contacts and relationships
- **Automated Job Search** — Configure searches across job boards
- **CV Tailoring** — AI-assisted resume customization for specific roles

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **CSV Processing**: csv-parse
- **File Upload**: Multer

## Project Structure

```
JobPilot-WebApp/
├── backend/          # Express API server
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/         # React + Vite app
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on `http://localhost:3000`

## API Endpoints

- `GET /api/health` — Health check
- `POST /api/csv/upload` — Upload and parse CSV file
- `POST /api/applications/save` — Save application data
- `POST /api/network/save` — Save network contacts

## CSV Format

### Applications

```csv
COMPANY,ROLE_ID,INFO,CV_FILE,DATE,STATUS,LINK,LOCATION,REFERAL,Phone Interview,Technical Interview2
```

### Network Contacts

```csv
Company Name,Contact,Phone Number,relation
```

## Development

Both frontend and backend support hot-reload in development mode.

Run in parallel terminals:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## Build

### Backend
No build needed—runs Node.js directly.

### Frontend
```bash
cd frontend
npm run build
```

Output in `frontend/dist/`

## License

ISC

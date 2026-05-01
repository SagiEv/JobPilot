# JobPilot Web App — Setup Instructions

## Project Status

- [x] Project scaffolding complete
- [x] Backend (Express + CSV parsing) configured
- [x] Frontend (React + Vite) configured
- [ ] Install dependencies
- [ ] Start development servers
- [ ] Test CSV upload functionality

## Next Steps

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start Both Servers**
   - Terminal 1: `cd backend && npm run dev`
   - Terminal 2: `cd frontend && npm run dev`

4. **Access the App**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Key Features

### CSV Upload
- Applications and network contacts import with robust error handling
- Supports up to 50MB files
- Multipart form data with server-side validation

### Backend API
- Express server with CORS enabled
- Multer for file uploads
- csv-parse for parsing

### Frontend
- React components with hooks
- Axios for API calls
- Vite for fast dev experience

## Environment Files

Copy .env.example to .env in both directories and adjust as needed.

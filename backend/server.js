const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Import Routes ---
const userRoutes = require('./routes/user.route.js');
const profileRoutes = require('./routes/profile.routes');
const applicationRoutes = require('./routes/applications.routes');
const contactRoutes = require('./routes/contacts.routes');
const experienceRoutes = require('./routes/experience.routes');
const interviewRoutes = require('./routes/interviews.routes');
const searchRoutes = require('./routes/searchSettings.routes');
const skillRoutes = require('./routes/skills.routes');
const cvRoutes = require('./routes/cv.routes');
const csvRoutes = require('./routes/csv.routes');
const settingsRoutes = require('./routes/settings.routes');
const tailorRoutes = require('./routes/tailor.routes');
const emailRoutes = require('./routes/email.routes');
const messagesRoutes = require('./routes/messages.routes');
const eventsRoutes = require('./routes/events.routes');

// --- Mount Routes ---
app.use('/auth', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/search-settings', searchRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tailor', tailorRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/events', eventsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 JobPilot API running on http://localhost:${PORT}`);
});

module.exports = app;
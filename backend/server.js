const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { connectDB } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const habitRoutes = require('./routes/habit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const weatherRoutes = require('./routes/weather.routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (fail fast on startup)
connectDB().catch((err) => {
  console.error('Failed to start due to DB error:', err);
  process.exit(1);
});

// Middlewares
app.use(cors());
app.use(express.json());

// Password reset / forgot (HTML) — before static so /reset-password and /forgot-password work without .html
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'reset-password.html'));
});
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'forgot-password.html'));
});

// Serve frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.use(authRoutes); // /register, /login, /forgot-password, /reset-password
app.use(profileRoutes); // /get-profile and /update-profile
app.use(habitRoutes); // /add-habit, /get-habits, /update-habit
app.use(dashboardRoutes); // /dashboard-data
app.use(recommendationRoutes); // /recommendations/*
app.use('/api', weatherRoutes); // /api/weather

// 404 handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Life3600 backend running on http://localhost:${PORT}`);
});


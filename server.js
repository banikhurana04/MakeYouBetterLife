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
const goalsRoutes = require('./routes/goals.routes');
const aiRoutes = require('./routes/ai.routes');
const { startReminderEngine } = require('./services/reminder.service');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Serve frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Redirect root to login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// API routes
app.use(authRoutes); // /register and /login
app.use(profileRoutes); // /get-profile and /update-profile
app.use(habitRoutes); // /add-habit, /get-habits, /update-habit
app.use(dashboardRoutes); // /dashboard-data
app.use(recommendationRoutes); // /recommendations/*
app.use(goalsRoutes); // /set-goals, /get-goals, /goal-progress, /reminder-status
app.use(aiRoutes); // /get-mood-prediction, /analyze-face

// 404 handlers
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    startReminderEngine();
    console.log(`MakeYouBetter backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message || err);
  console.error(
    'If using local MongoDB: start the MongoDB service, or set MONGO_URI in .env (e.g. Atlas).'
  );
  process.exit(1);
});


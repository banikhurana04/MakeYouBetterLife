const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { setGoals, getGoals, getGoalProgress, getReminderStatus } = require('../controllers/goals.controller');

const router = express.Router();

router.post('/set-goals', requireAuth, setGoals);
router.get('/get-goals', requireAuth, getGoals);

// Additional helper endpoints for dashboard progress/reminder polling
router.get('/goal-progress', requireAuth, getGoalProgress);
router.get('/reminder-status', requireAuth, getReminderStatus);

module.exports = router;


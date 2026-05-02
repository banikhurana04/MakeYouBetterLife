const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { addHabit, getHabits, updateHabit } = require('../controllers/habit.controller');

const router = express.Router();

router.post('/add-habit', requireAuth, addHabit);
router.get('/get-habits', requireAuth, getHabits);
router.put('/update-habit', requireAuth, updateHabit);

module.exports = router;


const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const Habit = require('../models/Habit'); // Fixed import path

// Multer setup for image uploads (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const FLASK_URL = 'http://127.0.0.1:5001';

router.get('/get-mood-prediction', requireAuth, async (req, res) => {
    try {
        // Fetch user's recent habits to calculate sleep, water, exercise
        const habits = await Habit.find({ userId: req.userId }).sort({ date: -1 }).limit(7);
        
        let sleep_hours = 0;
        let water_intake = 0;
        let exercise_minutes = 0;
        let count = habits.length;

        if (count > 0) {
            habits.forEach(h => {
                if (h.sleep_hours) sleep_hours += h.sleep_hours;
                if (h.water_intake) water_intake += h.water_intake;
                if (h.exercise_minutes) exercise_minutes += h.exercise_minutes;
            });
            sleep_hours = sleep_hours / count;
            water_intake = water_intake / count;
            exercise_minutes = exercise_minutes / count;
        } else {
            // Default values if no habits found
            sleep_hours = 7;
            water_intake = 2.0;
            exercise_minutes = 30;
        }

        // Call Flask Service
        const response = await fetch(`${FLASK_URL}/predict-mood`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sleep_hours,
                water_intake,
                exercise_minutes
            })
        });

        if (!response.ok) {
            throw new Error(`Flask API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Mood prediction error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch mood prediction.' });
    }
});

router.post('/analyze-face', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }

        // Native FormData (available in Node 18+)
        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', blob, req.file.originalname);

        const response = await fetch(`${FLASK_URL}/predict-skin`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Flask API error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Face analysis error:', error);
        res.status(500).json({ success: false, message: 'Failed to analyze face image.' });
    }
});

module.exports = router;

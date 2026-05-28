const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getDashboardData } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/dashboard-data', requireAuth, getDashboardData);

module.exports = router;


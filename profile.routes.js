const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getProfile, updateProfile } = require('../controllers/profile.controller');

const router = express.Router();

router.get('/get-profile', requireAuth, getProfile);
router.put('/update-profile', requireAuth, updateProfile);

module.exports = router;


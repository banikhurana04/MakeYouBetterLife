const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  skincareRecommendation,
  fashionRecommendation,
} = require('../controllers/recommendation.controller');

const router = express.Router();

router.post('/recommendations/skincare', requireAuth, skincareRecommendation);
router.post('/recommendations/fashion', requireAuth, fashionRecommendation);

module.exports = router;


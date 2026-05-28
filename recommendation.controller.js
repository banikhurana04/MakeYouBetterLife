const User = require('../models/User');
const Habit = require('../models/Habit');
const { buildSkinCareRecommendation } = require('../utils/skinCareEngine');
const { buildFashionRecommendation } = require('../utils/fashionEngine');

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function safeAvg(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function getLifestyleSnapshot(userId) {
  // Use last 7 days averages (simple + stable)
  const today = startOfToday();
  const start = addDays(today, -6);

  const habits = await Habit.find({ userId, date: { $gte: start, $lte: today } }).sort({ date: 1 });

  const sleepAvg = safeAvg(habits.map((h) => h.sleep_hours).filter((v) => v !== null && v !== undefined));
  const waterAvg = safeAvg(habits.map((h) => h.water_intake).filter((v) => v !== null && v !== undefined));

  return {
    avg_sleep_last_7_days: sleepAvg === null ? null : Number(sleepAvg.toFixed(2)),
    avg_water_intake: waterAvg === null ? null : Number(waterAvg.toFixed(2)),
    // also provide raw keys used by engine
    sleep_hours: sleepAvg === null ? null : Number(sleepAvg.toFixed(2)),
    water_intake: waterAvg === null ? null : Number(waterAvg.toFixed(2)),
  };
}

// POST /recommendations/skincare  (JWT required)
async function skincareRecommendation(req, res, next) {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select('skin_type');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const lifestyle = await getLifestyleSnapshot(userId);

    const skin_type = req.body?.skin_type || user.skin_type;
    const concerns = req.body?.concerns || [];

    const result = buildSkinCareRecommendation({
      skin_type,
      concerns,
      lifestyle: {
        sleep_hours: lifestyle.sleep_hours,
        water_intake: lifestyle.water_intake,
      },
    });

    res.json({
      lifestyle,
      recommendation: result,
    });
  } catch (err) {
    next(err);
  }
}

// POST /recommendations/fashion  (JWT required)
async function fashionRecommendation(req, res, next) {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select('fashion_style');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const occasion = req.body?.occasion;
    const time = req.body?.time;
    const weather = req.body?.weather;
    const style = req.body?.style || user.fashion_style || 'casual';

    const result = buildFashionRecommendation({ occasion, time, weather, style });

    res.json({ recommendation: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { skincareRecommendation, fashionRecommendation };


const User = require('../models/User');
const { buildSkinCareRecommendation } = require('../utils/skinCareEngine');
const { buildSkincareMeta } = require('../utils/skincareMeta');
const { fetchHealthDatasetForUser } = require('../utils/healthDataset');
const { buildFashionRecommendation } = require('../utils/fashionEngine');
const { getWeatherByCity, mapConditionToFashionWeather } = require('../services/weather.service');

function buildSkincareReason({ skinType, concernsList, lifestyle }) {
  const typeLabel =
    {
      oily: 'oily',
      dry: 'dry',
      combination: 'combination',
      sensitive: 'sensitive',
    }[skinType] || skinType || 'combination';

  let reason = `Recommended because your skin type is ${typeLabel}.`;

  if (concernsList.length > 0) {
    reason += ` It also addresses your selected concerns: ${concernsList.join(', ')}.`;
  }

  const sleep = lifestyle?.avg_sleep_last_7_days ?? lifestyle?.sleep_hours;
  const water = lifestyle?.avg_water_intake ?? lifestyle?.water_intake;

  if (typeof sleep === 'number' && !Number.isNaN(sleep) && sleep < 6.5) {
    reason += ' Your recent sleep average is low, so the routine leans gentle on barrier support.';
  }

  if (typeof water === 'number' && !Number.isNaN(water) && water < 1.8) {
    reason += ' Your recent water intake average is low, so hydrating steps are emphasized.';
  }

  return reason;
}

function lifestyleFromHealthDataset(healthDataset) {
  const s = healthDataset?.averages?.sleepHours ?? null;
  const w = healthDataset?.averages?.waterLitres ?? null;
  return {
    avg_sleep_last_7_days: s,
    avg_water_intake: w,
    sleep_hours: s,
    water_intake: w,
  };
}

// POST /recommendations/skincare  (JWT required)
async function skincareRecommendation(req, res, next) {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select('skin_type');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const healthDataset = await fetchHealthDatasetForUser(userId);
    const lifestyle = lifestyleFromHealthDataset(healthDataset);

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

    const reason = buildSkincareReason({
      skinType: result.inputs.skin_type,
      concernsList: result.inputs.concerns,
      lifestyle,
    });

    const metaBase = buildSkincareMeta({
      lifestyle,
      concerns,
      skin_type,
    });

    const meta = {
      ...metaBase,
      habitHealth: {
        healthScore: healthDataset.healthScore,
        category: healthDataset.category,
        scores: healthDataset.scores,
        trends: healthDataset.trends,
        insights: healthDataset.insights,
        ideals: healthDataset.ideals,
      },
    };

    res.json({
      lifestyle,
      recommendation: result,
      reason,
      meta,
      healthDataset,
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
    const style = req.body?.style || user.fashion_style || 'casual';

    let weather = req.body?.weather;
    if (req.body?.city) {
      const summary = await getWeatherByCity(req.body.city);
      weather = mapConditionToFashionWeather(summary.condition);
    }

    const result = buildFashionRecommendation({ occasion, time, weather, style });

    res.json({ recommendation: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { skincareRecommendation, fashionRecommendation };


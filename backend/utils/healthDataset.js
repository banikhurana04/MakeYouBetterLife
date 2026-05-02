/**
 * Dataset-driven habit health metrics (rule-based, explainable).
 * Ideals: 8h sleep, 3L water, 30min exercise → component scores 0–100.
 */

const IDEAL_SLEEP_HOURS = 8;
const IDEAL_WATER_LITRES = 3;
const IDEAL_EXERCISE_MINUTES = 30;

const TREND_THRESHOLD = 2; // percent change vs earlier half-week (aligned with dashboard)

function numericSeries(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v) => typeof v === 'number' && Number.isFinite(v));
}

function safeAvg(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
}

function trendFromTwoPeriods(currentAvg, previousAvg) {
  if (currentAvg === null || previousAvg === null) return { direction: 'flat', changePercent: 0 };
  if (previousAvg === 0) return { direction: 'flat', changePercent: 0 };
  const change = ((currentAvg - previousAvg) / Math.abs(previousAvg)) * 100;
  if (change > TREND_THRESHOLD) return { direction: 'up', changePercent: Number(change.toFixed(1)) };
  if (change < -TREND_THRESHOLD) return { direction: 'down', changePercent: Number(change.toFixed(1)) };
  return { direction: 'flat', changePercent: Number(change.toFixed(1)) };
}

/**
 * Normalize a raw average against an ideal → 0–100.
 * @param {number|null} avg
 * @param {number} ideal
 * @returns {number|null}
 */
function componentScore(avg, ideal) {
  if (avg === null || typeof avg !== 'number' || !Number.isFinite(avg) || ideal <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (avg / ideal) * 100)));
}

function classifyHealth(healthScore) {
  if (healthScore === null || typeof healthScore !== 'number' || !Number.isFinite(healthScore)) {
    return 'Insufficient data';
  }
  if (healthScore > 80) return 'Healthy';
  if (healthScore >= 50) return 'Moderate';
  return 'Needs Improvement';
}

function trendNarrative(name, trend) {
  if (!trend || trend.direction === 'flat' || Math.abs(trend.changePercent) <= TREND_THRESHOLD) {
    return { direction: trend?.direction || 'flat', changePercent: trend?.changePercent ?? 0, summary: null };
  }
  if (name === 'sleep') {
    if (trend.direction === 'down') {
      return { ...trend, summary: 'Your sleep trend is decreasing' };
    }
    if (trend.direction === 'up') {
      return { ...trend, summary: 'Your sleep trend is improving' };
    }
  }
  if (name === 'water') {
    if (trend.direction === 'down') {
      return { ...trend, summary: 'Your water intake is declining' };
    }
    if (trend.direction === 'up') {
      return { ...trend, summary: 'Water intake is improving' };
    }
  }
  if (name === 'exercise') {
    if (trend.direction === 'down') {
      return { ...trend, summary: 'Your exercise trend is decreasing' };
    }
    if (trend.direction === 'up') {
      return { ...trend, summary: 'Your activity level is improving' };
    }
  }
  return { ...trend, summary: null };
}

/**
 * @param {{
 *   averages: { sleep: number|null, water: number|null, exercise: number|null },
 *   trends: {
 *     sleep: { direction: string, changePercent: number },
 *     water: { direction: string, changePercent: number },
 *     exercise: { direction: string, changePercent: number },
 *   },
 *   series?: { sleep?: any[], water?: any[], exercise?: any[] },
 * }} input
 */
function buildHealthDataset(input) {
  const averages = input.averages || {};
  const trendsIn = input.trends || {};
  const series = input.series || {};

  const sleepAvg = averages.sleep;
  const waterAvg = averages.water;
  const exerciseAvg = averages.exercise;

  const sleepScore = componentScore(sleepAvg, IDEAL_SLEEP_HOURS);
  const waterScore = componentScore(waterAvg, IDEAL_WATER_LITRES);
  const exerciseScore = componentScore(exerciseAvg, IDEAL_EXERCISE_MINUTES);

  const parts = [sleepScore, waterScore, exerciseScore].filter((s) => s !== null);
  const healthScore =
    parts.length === 0 ? null : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);

  const category = classifyHealth(healthScore);

  const sleepTrend = trendNarrative('sleep', trendsIn.sleep);
  const waterTrend = trendNarrative('water', trendsIn.water);
  const exerciseTrend = trendNarrative('exercise', trendsIn.exercise);

  const trends = {
    sleep: {
      direction: sleepTrend.direction,
      changePercent: sleepTrend.changePercent,
      summary: sleepTrend.summary,
    },
    water: {
      direction: waterTrend.direction,
      changePercent: waterTrend.changePercent,
      summary: waterTrend.summary,
    },
    exercise: {
      direction: exerciseTrend.direction,
      changePercent: exerciseTrend.changePercent,
      summary: exerciseTrend.summary,
    },
  };

  const insights = [];

  if (sleepTrend.summary) insights.push(sleepTrend.summary);
  if (waterTrend.summary) insights.push(waterTrend.summary);
  if (exerciseTrend.summary) insights.push(exerciseTrend.summary);

  const sleepVals = numericSeries(series.sleep);
  const waterVals = numericSeries(series.water);

  const hasSleep = sleepVals.length >= 1 && typeof sleepAvg === 'number' && Number.isFinite(sleepAvg);
  const hasWater = waterVals.length >= 1 && typeof waterAvg === 'number' && Number.isFinite(waterAvg);

  if (hasSleep && hasWater && sleepAvg < 6 && waterAvg < 2) {
    insights.push('Poor lifestyle may affect skin health');
  }

  const exerciseVals = numericSeries(series.exercise);
  const hasExercise =
    exerciseVals.length >= 1 && typeof exerciseAvg === 'number' && Number.isFinite(exerciseAvg);

  if (
    sleepScore !== null &&
    waterScore !== null &&
    exerciseScore !== null &&
    sleepScore >= 70 &&
    waterScore >= 70 &&
    exerciseScore >= 70
  ) {
    insights.push('Your lifestyle is balanced');
  }

  if (healthScore !== null && category !== 'Insufficient data') {
    insights.push(`Overall habit health: ${category} (score ${healthScore}/100)`);
  }

  const notifications = [];
  if (hasSleep && sleepAvg < 6) notifications.push('Low sleep detected');
  if (hasWater && waterAvg < 2) notifications.push('Drink more water');
  if (hasExercise && exerciseAvg < 20) notifications.push('Increase activity');

  return {
    ideals: {
      sleepHours: IDEAL_SLEEP_HOURS,
      waterLitres: IDEAL_WATER_LITRES,
      exerciseMinutes: IDEAL_EXERCISE_MINUTES,
    },
    averages: {
      sleepHours: sleepAvg === null ? null : Number(Number(sleepAvg).toFixed(2)),
      waterLitres: waterAvg === null ? null : Number(Number(waterAvg).toFixed(2)),
      exerciseMinutes: exerciseAvg === null ? null : Number(Number(exerciseAvg).toFixed(1)),
    },
    scores: {
      sleepScore,
      waterScore,
      exerciseScore,
    },
    healthScore,
    category,
    trends,
    insights: [...new Set(insights)],
    notifications,
  };
}

/**
 * Derive 7-day trends from weekly series (indices 0–2 vs 3–6), same as dashboard.
 */
function trendsFromWeeklySeries(weeklySleep, weeklyWater, weeklyExercise) {
  const prevIdx = [0, 1, 2];
  const curIdx = [3, 4, 5, 6];

  const pick = (arr, indices) =>
    safeAvg(indices.map((i) => (Array.isArray(arr) ? arr[i] : null)).filter((v) => v !== null && v !== undefined));

  return {
    sleep: trendFromTwoPeriods(pick(weeklySleep, curIdx), pick(weeklySleep, prevIdx)),
    water: trendFromTwoPeriods(pick(weeklyWater, curIdx), pick(weeklyWater, prevIdx)),
    exercise: trendFromTwoPeriods(pick(weeklyExercise, curIdx), pick(weeklyExercise, prevIdx)),
  };
}

// --- Optional: single DB round-trip for skincare / lightweight consumers ---

const Habit = require('../models/Habit');

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Load last 7 calendar days of habits and build the health dataset (same window as dashboard).
 * @param {import('mongoose').Types.ObjectId|string} userId
 */
async function fetchHealthDatasetForUser(userId) {
  const today = startOfToday();
  const rangeStart = addDays(today, -6);

  const habits = await Habit.find({
    userId,
    date: { $gte: rangeStart, $lte: today },
  }).sort({ date: 1 });

  const habitLast7ByDay = new Map(habits.map((h) => [isoDay(h.date), h]));
  const days = Array.from({ length: 7 }, (_, idx) => addDays(rangeStart, idx));

  const sleepValues = [];
  const waterValues = [];
  const exerciseValues = [];

  days.forEach((d) => {
    const h = habitLast7ByDay.get(isoDay(d));
    if (h) {
      if (h.sleep_hours !== null && h.sleep_hours !== undefined) sleepValues.push(h.sleep_hours);
      if (h.water_intake !== null && h.water_intake !== undefined) waterValues.push(h.water_intake);
      if (h.exercise_minutes !== null && h.exercise_minutes !== undefined) {
        exerciseValues.push(h.exercise_minutes);
      }
    }
  });

  const avgSleepLast7 = safeAvg(sleepValues);
  const avgWaterLast7 = safeAvg(waterValues);
  const avgExerciseLast7 = safeAvg(exerciseValues);

  const weeklySleep = days.map((d) => habitLast7ByDay.get(isoDay(d))?.sleep_hours ?? null);
  const weeklyWater = days.map((d) => habitLast7ByDay.get(isoDay(d))?.water_intake ?? null);
  const weeklyExercise = days.map((d) => habitLast7ByDay.get(isoDay(d))?.exercise_minutes ?? null);

  const trends = trendsFromWeeklySeries(weeklySleep, weeklyWater, weeklyExercise);

  return buildHealthDataset({
    averages: {
      sleep: avgSleepLast7,
      water: avgWaterLast7,
      exercise: avgExerciseLast7,
    },
    trends,
    series: {
      sleep: weeklySleep,
      water: weeklyWater,
      exercise: weeklyExercise,
    },
  });
}

module.exports = {
  buildHealthDataset,
  trendsFromWeeklySeries,
  fetchHealthDatasetForUser,
  safeAvg,
  trendFromTwoPeriods,
  componentScore,
  IDEAL_SLEEP_HOURS,
  IDEAL_WATER_LITRES,
  IDEAL_EXERCISE_MINUTES,
};

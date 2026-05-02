/**
 * Daily habit score (0–100) from sleep, water, and exercise only.
 * Targets: ~7–9h sleep, ~2.5L water, ~30 min exercise as “full” marks.
 */

function startOfDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function addDays(date, amount) {
  const out = new Date(date);
  out.setDate(out.getDate() + amount);
  return out;
}

function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function scoreSleepHours(hours) {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0) return null;
  if (hours >= 7 && hours <= 9) return 100;
  if (hours < 7) return Math.min(100, Math.round((hours / 7) * 100));
  return Math.max(0, Math.round(100 - (hours - 9) * 12));
}

function scoreWaterLitres(litres) {
  if (typeof litres !== 'number' || !Number.isFinite(litres) || litres < 0) return null;
  return Math.min(100, Math.round((litres / 2.5) * 100));
}

function scoreExerciseMinutes(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return null;
  return Math.min(100, Math.round((minutes / 30) * 100));
}

function dailyScoreFromHabit(h) {
  if (!h) return null;
  const s = scoreSleepHours(h.sleep_hours);
  const w = scoreWaterLitres(h.water_intake);
  const e = scoreExerciseMinutes(h.exercise_minutes);
  if (s === null || w === null || e === null) return null;
  return Math.round((s + w + e) / 3);
}

function classifyHabitCategory(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'Needs Improvement';
  if (score > 80) return 'Healthy';
  if (score > 50) return 'Average';
  return 'Needs Improvement';
}

function averageScoresForDayList(dayList, habitByDay) {
  const scores = dayList
    .map((d) => dailyScoreFromHabit(habitByDay.get(isoDay(d))))
    .filter((x) => x !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function improvementPercent(currentAvg, previousAvg) {
  if (currentAvg === null || previousAvg === null) return null;
  if (previousAvg === 0) {
    if (currentAvg === 0) return 0;
    return 100;
  }
  return Number((((currentAvg - previousAvg) / previousAvg) * 100).toFixed(1));
}

/**
 * @param {Map<string, object>} habitByDay — iso date key → habit doc
 * @param {Date} today — calendar “today” at local midnight
 */
function buildHabitScoreSummary(habitByDay, today) {
  const t = startOfDay(today);

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(t, -6 + i));
  const prev7 = Array.from({ length: 7 }, (_, i) => addDays(t, -13 + i));

  const averageLast7Days = averageScoresForDayList(last7, habitByDay);
  const previous7DaysAverage = averageScoresForDayList(prev7, habitByDay);

  const headlineScore = averageLast7Days !== null ? averageLast7Days : 0;
  const category = classifyHabitCategory(headlineScore);

  const todayHabit = habitByDay.get(isoDay(t));
  const todayScore = dailyScoreFromHabit(todayHabit);

  const improvement = improvementPercent(averageLast7Days, previous7DaysAverage);

  return {
    score: headlineScore,
    todayScore,
    averageLast7Days: averageLast7Days !== null ? averageLast7Days : 0,
    previous7DaysAverage,
    improvementPercent: improvement,
    category,
    score_category: category,
    improvement_percent: improvement,
  };
}

module.exports = {
  buildHabitScoreSummary,
  dailyScoreFromHabit,
  classifyHabitCategory,
  scoreSleepHours,
  scoreWaterLitres,
  scoreExerciseMinutes,
};

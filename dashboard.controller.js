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
  // local ISO (avoid UTC shifting)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isCompleteDay(h) {
  return (
    h &&
    h.sleep_hours !== null &&
    h.sleep_hours !== undefined &&
    h.water_intake !== null &&
    h.water_intake !== undefined &&
    h.meals !== null &&
    h.meals !== undefined &&
    h.exercise_minutes !== null &&
    h.exercise_minutes !== undefined
  );
}

function safeAvg(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  const sum = nums.reduce((acc, v) => acc + v, 0);
  return sum / nums.length;
}

function trendFromTwoPeriods(currentAvg, previousAvg) {
  if (currentAvg === null || previousAvg === null) return { direction: 'flat', changePercent: 0 };
  if (previousAvg === 0) return { direction: 'flat', changePercent: 0 };

  const change = ((currentAvg - previousAvg) / Math.abs(previousAvg)) * 100;
  if (change > 2) return { direction: 'up', changePercent: Number(change.toFixed(1)) };
  if (change < -2) return { direction: 'down', changePercent: Number(change.toFixed(1)) };
  return { direction: 'flat', changePercent: Number(change.toFixed(1)) };
}

async function getDashboardData(req, res, next) {
  try {
    const userId = req.userId;
    const today = startOfToday();

    const totalHabits = await Habit.countDocuments({ userId });

    // Pull habits from last 60 days so we can compute streak safely
    const habitsForStreak = await Habit.find({
      userId,
      date: { $gte: addDays(today, -59), $lte: today },
    }).sort({ date: 1 });

    const habitByDay = new Map();
    habitsForStreak.forEach((h) => habitByDay.set(isoDay(h.date), h));

    // Streak: consecutive complete days ending today
    let streakDays = 0;
    for (let i = 0; i < 365; i += 1) {
      const day = addDays(today, -i);
      const key = isoDay(day);
      const h = habitByDay.get(key);
      if (isCompleteDay(h)) streakDays += 1;
      else break;
    }

    const todayHabit = habitByDay.get(isoDay(today));
    const completedToday = isCompleteDay(todayHabit);

    // Last 7 days window
    const rangeStart = addDays(today, -6);
    const habitsLast7 = await Habit.find({
      userId,
      date: { $gte: rangeStart, $lte: today },
    }).sort({ date: 1 });

    const habitLast7ByDay = new Map(habitsLast7.map((h) => [isoDay(h.date), h]));

    const days = Array.from({ length: 7 }, (_, idx) => addDays(rangeStart, idx));

    const sleepValues = [];
    const waterValues = [];
    const exerciseValues = [];
    const mealValues = [];

    let completeDaysCount = 0;
    days.forEach((d) => {
      const h = habitLast7ByDay.get(isoDay(d));
      if (isCompleteDay(h)) completeDaysCount += 1;

      if (h) {
        if (h.sleep_hours !== null && h.sleep_hours !== undefined) sleepValues.push(h.sleep_hours);
        if (h.water_intake !== null && h.water_intake !== undefined) waterValues.push(h.water_intake);
        if (h.exercise_minutes !== null && h.exercise_minutes !== undefined) exerciseValues.push(h.exercise_minutes);
        if (h.meals !== null && h.meals !== undefined) mealValues.push(h.meals);
      }
    });

    const avgSleepLast7 = safeAvg(sleepValues);
    const avgWaterLast7 = safeAvg(waterValues);
    const avgExerciseLast7 = safeAvg(exerciseValues);
    const avgMealsLast7 = safeAvg(mealValues);

    const completionRate = Math.round((completeDaysCount / 7) * 100);
    const activityScore = avgExerciseLast7 === null ? 0 : Math.max(0, Math.min(100, Math.round((avgExerciseLast7 / 60) * 100)));

    // Trends: compare avg of last 3 days vs previous 3 days
    const prevPeriodDays = days.slice(0, 3);
    const currentPeriodDays = days.slice(3, 7);

    const avgSleepPrev = safeAvg(
      prevPeriodDays.map((d) => habitLast7ByDay.get(isoDay(d))?.sleep_hours).filter((v) => v !== null && v !== undefined)
    );
    const avgSleepCurrent = safeAvg(
      currentPeriodDays.map((d) => habitLast7ByDay.get(isoDay(d))?.sleep_hours).filter((v) => v !== null && v !== undefined)
    );

    const avgWaterPrev = safeAvg(
      prevPeriodDays.map((d) => habitLast7ByDay.get(isoDay(d))?.water_intake).filter((v) => v !== null && v !== undefined)
    );
    const avgWaterCurrent = safeAvg(
      currentPeriodDays.map((d) => habitLast7ByDay.get(isoDay(d))?.water_intake).filter((v) => v !== null && v !== undefined)
    );

    const avgExercisePrev = safeAvg(
      prevPeriodDays.map((d) => habitLast7ByDay.get(isoDay(d))?.exercise_minutes).filter((v) => v !== null && v !== undefined)
    );
    const avgExerciseCurrent = safeAvg(
      currentPeriodDays.map((d) => habitLast7ByDay.get(isoDay(d))?.exercise_minutes).filter((v) => v !== null && v !== undefined)
    );

    const sleepTrend = trendFromTwoPeriods(avgSleepCurrent, avgSleepPrev);
    const waterTrend = trendFromTwoPeriods(avgWaterCurrent, avgWaterPrev);
    const exerciseTrend = trendFromTwoPeriods(avgExerciseCurrent, avgExercisePrev);

    // Weekly chart arrays (7 points)
    const weeklyLabels = days.map((d) => d.toLocaleDateString(undefined, { weekday: 'short' }));
    const weeklySleep = days.map((d) => habitLast7ByDay.get(isoDay(d))?.sleep_hours ?? null);
    const weeklyWater = days.map((d) => habitLast7ByDay.get(isoDay(d))?.water_intake ?? null);
    const weeklyExercise = days.map((d) => habitLast7ByDay.get(isoDay(d))?.exercise_minutes ?? null);

    // Monthly chart (rolling 30 days) grouped into weeks (4-5 buckets)
    const monthStart = addDays(today, -29);
    const monthDays = Array.from({ length: 30 }, (_, idx) => addDays(monthStart, idx));
    const buckets = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      const chunk = monthDays.slice(i, i + 7);
      const label = `Week ${buckets.length + 1}`;
      const sleep = safeAvg(chunk.map((d) => habitByDay.get(isoDay(d))?.sleep_hours));
      const water = safeAvg(chunk.map((d) => habitByDay.get(isoDay(d))?.water_intake));
      const exercise = safeAvg(chunk.map((d) => habitByDay.get(isoDay(d))?.exercise_minutes));
      buckets.push({ label, sleep, water, exercise });
    }

    const monthlyLabels = buckets.map((b) => b.label);
    const monthlySleep = buckets.map((b) => (b.sleep === null ? null : Number(b.sleep.toFixed(2))));
    const monthlyExercise = buckets.map((b) => (b.exercise === null ? null : Number(b.exercise.toFixed(1))));

    res.json({
      summary: {
        totalHabits,
        completedToday,
        streakDays,
        // snake_case aliases (for beginners / example consistency)
        total_habits: totalHabits,
        completed_today: completedToday,
        streak_days: streakDays,
      },
      averages: {
        avgSleepHoursLast7Days: avgSleepLast7 === null ? 0 : Number(avgSleepLast7.toFixed(2)),
        avgWaterIntakeLast7Days: avgWaterLast7 === null ? 0 : Number(avgWaterLast7.toFixed(2)),
        activityScore,
        avgMealsLast7Days: avgMealsLast7 === null ? 0 : Number(avgMealsLast7.toFixed(2)),
        // example-style aliases
        avg_sleep_last_7_days: avgSleepLast7 === null ? 0 : Number(avgSleepLast7.toFixed(2)),
        avg_water_intake: avgWaterLast7 === null ? 0 : Number(avgWaterLast7.toFixed(2)),
        activity_score: activityScore,
        avg_meals_last_7_days: avgMealsLast7 === null ? 0 : Number(avgMealsLast7.toFixed(2)),
      },
      completionRate,
      completion_rate: completionRate,
      trends: {
        sleep: sleepTrend,
        water: waterTrend,
        exercise: exerciseTrend,
      },
      weeklyTrends: {
        labels: weeklyLabels,
        sleep_hours: weeklySleep,
        water_intake: weeklyWater,
        exercise_minutes: weeklyExercise,
      },
      monthlyTrends: {
        labels: monthlyLabels,
        sleep_hours: monthlySleep,
        exercise_minutes: monthlyExercise,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDashboardData };


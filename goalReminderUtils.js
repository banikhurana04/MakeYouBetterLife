function parseTimeToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

function getAwakeWindow(wakeTime, sleepTime) {
  const wake = parseTimeToMinutes(wakeTime);
  const sleep = parseTimeToMinutes(sleepTime);
  let awakeMinutes = sleep - wake;
  if (awakeMinutes <= 0) awakeMinutes += 24 * 60; // crosses midnight
  return { wake, sleep, awakeMinutes };
}

function minutesSinceWake(now, wakeTime) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const wake = parseTimeToMinutes(wakeTime);
  let diff = nowMinutes - wake;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function isSleepingNow(now, wakeTime, sleepTime) {
  const nowM = now.getHours() * 60 + now.getMinutes();
  const wake = parseTimeToMinutes(wakeTime);
  const sleep = parseTimeToMinutes(sleepTime);

  if (wake < sleep) {
    // same day sleep
    return nowM < wake || nowM >= sleep;
  }
  // crosses midnight (e.g. wake 08:00, sleep 00:00)
  return nowM >= sleep && nowM < wake;
}

function pct(value, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

function buildGoalProgress(goal, habit) {
  const waterDone = habit?.water_intake ?? 0;
  const sleepDone = habit?.sleep_hours ?? 0;
  const exerciseDone = habit?.exercise_minutes ?? 0;

  return {
    water: {
      current: waterDone,
      goal: goal.water_goal,
      percent: pct(waterDone, goal.water_goal),
      remaining: Math.max(0, Number((goal.water_goal - waterDone).toFixed(2))),
    },
    sleep: {
      current: sleepDone,
      goal: goal.sleep_goal,
      percent: pct(sleepDone, goal.sleep_goal),
      remaining: Math.max(0, Number((goal.sleep_goal - sleepDone).toFixed(2))),
    },
    exercise: {
      current: exerciseDone,
      goal: goal.exercise_goal,
      percent: pct(exerciseDone, goal.exercise_goal),
      remaining: Math.max(0, Number((goal.exercise_goal - exerciseDone).toFixed(2))),
    },
  };
}

function buildWaterReminder(goal, habit, now = new Date()) {
  const progress = buildGoalProgress(goal, habit);
  const waterDone = progress.water.current;
  const waterGoal = progress.water.goal;

  const sleeping = isSleepingNow(now, goal.wake_time, goal.sleep_time);
  if (sleeping) {
    return {
      shouldRemind: false,
      status: 'sleeping',
      message: 'Sleep time active. Reminders are paused.',
      intervalMinutes: null,
      expectedByNow: null,
      progress,
    };
  }

  if (waterDone >= waterGoal) {
    return {
      shouldRemind: false,
      status: 'completed',
      message: `Great work! You completed your water goal (${waterDone}/${waterGoal}L).`,
      intervalMinutes: null,
      expectedByNow: waterGoal,
      progress,
    };
  }

  const { awakeMinutes } = getAwakeWindow(goal.wake_time, goal.sleep_time);
  const awakeHours = awakeMinutes / 60;
  const elapsed = Math.min(minutesSinceWake(now, goal.wake_time), awakeMinutes);
  const elapsedRatio = awakeMinutes === 0 ? 0 : elapsed / awakeMinutes;
  const expectedByNow = Number((waterGoal * elapsedRatio).toFixed(2));

  // Base interval: split across 0.5L chunks, but keep sane bounds
  const remindersCount = Math.max(4, Math.ceil(waterGoal / 0.5));
  let intervalMinutes = Math.round((awakeHours * 60) / remindersCount);
  intervalMinutes = Math.max(60, Math.min(180, intervalMinutes)); // avoid too frequent

  // Intelligent adjustment: if behind schedule, nudge slightly more often
  const missedAmount = expectedByNow - waterDone;
  const behind = missedAmount > Math.max(0.3, waterGoal * 0.08);
  if (behind) {
    intervalMinutes = Math.max(45, Math.round(intervalMinutes * 0.8));
  }

  // Even if on-track, nudge at healthy intervals (non-aggressive)
  const periodicTick = intervalMinutes > 0 && elapsed >= intervalMinutes && elapsed % intervalMinutes <= 5;
  const shouldRemind = behind || periodicTick;
  const message = behind
    ? `Hydration check: ${waterDone}/${waterGoal}L done. You are below pace (expected ${expectedByNow}L).`
    : shouldRemind
    ? `Hydration reminder: ${waterDone}/${waterGoal}L done. Take a few sips now.`
    : `Nice pace: ${waterDone}/${waterGoal}L done. Keep going.`;

  return {
    shouldRemind,
    status: behind ? 'behind' : shouldRemind ? 'reminder' : 'on-track',
    message,
    intervalMinutes,
    expectedByNow,
    progress,
  };
}

module.exports = {
  buildGoalProgress,
  buildWaterReminder,
};


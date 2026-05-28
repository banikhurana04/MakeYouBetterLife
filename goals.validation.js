function isValidTimeHHMM(value) {
  if (typeof value !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function validateGoalsPayload(body) {
  const errors = [];
  const { water_goal, sleep_goal, exercise_goal, wake_time, sleep_time } = body || {};

  const water = Number(water_goal);
  const sleep = Number(sleep_goal);
  const exercise = Number(exercise_goal);

  if (Number.isNaN(water) || water < 0.5) errors.push('water_goal must be a number >= 0.5 liters.');
  if (Number.isNaN(sleep) || sleep < 1) errors.push('sleep_goal must be a number >= 1 hour.');
  if (Number.isNaN(exercise) || exercise < 5) errors.push('exercise_goal must be a number >= 5 minutes.');
  if (!isValidTimeHHMM(wake_time)) errors.push('wake_time must be in HH:mm format.');
  if (!isValidTimeHHMM(sleep_time)) errors.push('sleep_time must be in HH:mm format.');

  return errors;
}

function sanitizeGoalsPayload(body) {
  return {
    water_goal: Number(body.water_goal),
    sleep_goal: Number(body.sleep_goal),
    exercise_goal: Number(body.exercise_goal),
    wake_time: String(body.wake_time),
    sleep_time: String(body.sleep_time),
  };
}

module.exports = { validateGoalsPayload, sanitizeGoalsPayload };


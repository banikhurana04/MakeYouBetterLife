function isValidISODate(value) {
  if (typeof value !== 'string') return false;
  // Basic YYYY-MM-DD check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function parseOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return undefined; // marker for invalid
  return n;
}

function validateHabitPayload(body) {
  const errors = [];
  const { date, sleep_hours, water_intake, meals, exercise_minutes } = body || {};

  if (!date) {
    errors.push('date is required.');
  } else if (!isValidISODate(date)) {
    errors.push('date must be in YYYY-MM-DD format.');
  }

  const metrics = [
    ['sleep_hours', sleep_hours],
    ['water_intake', water_intake],
    ['meals', meals],
    ['exercise_minutes', exercise_minutes],
  ];

  metrics.forEach(([key, value]) => {
    const parsed = parseOptionalNumber(value);
    if (parsed === undefined) {
      errors.push(`${key} must be a valid number if provided.`);
      return;
    }
    if (parsed !== null && parsed < 0) {
      errors.push(`${key} must be >= 0.`);
    }
  });

  return errors;
}

function sanitizeHabitBody(body) {
  const sanitized = { date: body.date };

  const fields = ['sleep_hours', 'water_intake', 'meals', 'exercise_minutes'];
  fields.forEach((f) => {
    sanitized[f] = parseOptionalNumber(body[f]);
  });

  return sanitized;
}

module.exports = { validateHabitPayload, sanitizeHabitBody };


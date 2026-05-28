function validateProfileUpdate(body) {
  const errors = [];
  const { lifestyle_goal, skin_type, fashion_style } = body || {};

  const fields = [
    ['lifestyle_goal', lifestyle_goal],
    ['skin_type', skin_type],
    ['fashion_style', fashion_style],
  ];

  fields.forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) return;
    if (typeof value !== 'string') {
      errors.push(`${key} must be a string.`);
      return;
    }
    if (value.trim().length > 60) {
      errors.push(`${key} must be 60 characters or less.`);
    }
  });

  if (Object.keys(body || {}).length === 0) {
    errors.push('No profile fields provided.');
  }

  return errors;
}

module.exports = { validateProfileUpdate };


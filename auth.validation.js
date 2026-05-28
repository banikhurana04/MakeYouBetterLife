function validateRegister(body) {
  const errors = [];
  const { name, email, password } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required (min 2 characters).');
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('Valid email is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required (min 6 characters).');
  }

  return errors;
}

function validateLogin(body) {
  const errors = [];
  const { email, password } = body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('Valid email is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  return errors;
}

module.exports = { validateRegister, validateLogin };


const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const { validateRegister, validateLogin } = require('../validation/auth.validation');

async function registerUser(req, res, next) {
  try {
    const errors = validateRegister(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'Registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    return next(err);
  }
}

async function loginUser(req, res, next) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const ok = await user.matchPassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    return res.json({
      message: 'Logged in successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { registerUser, loginUser };


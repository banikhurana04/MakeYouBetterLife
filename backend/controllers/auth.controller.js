const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} = require('../validation/auth.validation');

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(raw) {
  return crypto.createHash('sha256').update(String(raw), 'utf8').digest('hex');
}

function appBaseUrl() {
  return process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
}

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

async function forgotPassword(req, res, next) {
  try {
    const errors = validateForgotPassword(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const { email } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    const genericMessage = 'If that email is registered, a reset link can be used below.';

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const plainToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    user.passwordResetTokenHash = hashResetToken(plainToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_EXPIRY_MS);
    await user.save();

    const resetLink = `${appBaseUrl()}/reset-password?token=${plainToken}`;
    console.log('[forgot-password] Reset link (dev):', resetLink);

    return res.json({
      message: genericMessage,
      resetLink,
    });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const errors = validateResetPassword(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const { token, password } = req.body;
    const tokenHash = hashResetToken(token.trim());

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    user.password = password;
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: 'Password updated. You can log in with your new password.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };


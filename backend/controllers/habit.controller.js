const Habit = require('../models/Habit');
const { validateHabitPayload, sanitizeHabitBody } = require('../validation/habit.validation');

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function normalizeISODate(value) {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDateRange(range, query) {
  const today = startOfToday();
  if (range === 'daily') {
    const date = query && query.date ? new Date(query.date) : today;
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return { start: normalized, end: normalized };
  }

  if (range === 'monthly') {
    return { start: addDays(today, -29), end: today }; // last 30 days rolling
  }

  // weekly default
  return { start: addDays(today, -6), end: today }; // last 7 days rolling
}

async function addHabit(req, res, next) {
  try {
    const errors = validateHabitPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const sanitized = sanitizeHabitBody(req.body);
    const userId = req.userId;
    const normalizedDate = normalizeISODate(sanitized.date);

    const habit = await Habit.findOneAndUpdate(
      { userId, date: normalizedDate },
      { $set: { ...sanitized, date: normalizedDate, userId } },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(201).json({ message: 'Habit saved', habit });
  } catch (err) {
    return next(err);
  }
}

async function getHabits(req, res, next) {
  try {
    const range = (req.query.range || 'weekly').toLowerCase();
    const allowed = ['daily', 'weekly', 'monthly'];
    if (!allowed.includes(range)) {
      return res.status(400).json({ message: 'Invalid range. Use daily, weekly, or monthly.' });
    }
    const { start, end } = getDateRange(range, req.query);

    const habits = await Habit.find({
      userId: req.userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    return res.json({ habits, range });
  } catch (err) {
    return next(err);
  }
}

async function updateHabit(req, res, next) {
  try {
    const { habitId, date } = req.body || {};
    const errors = validateHabitPayload({ ...req.body, date: date || req.body.date });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const sanitized = sanitizeHabitBody(req.body);
    const userId = req.userId;
    const normalizedDate = normalizeISODate(sanitized.date);

    if (habitId) {
      const habit = await Habit.findOneAndUpdate(
        { _id: habitId, userId },
        { $set: { ...sanitized, date: normalizedDate } },
        { new: true, runValidators: true }
      );

      if (!habit) return res.status(404).json({ message: 'Habit not found' });
      return res.json({ message: 'Habit updated', habit });
    }

    // Update by user+date
    const habit = await Habit.findOneAndUpdate(
      { userId, date: normalizedDate },
      { $set: { ...sanitized, date: normalizedDate } },
      { new: true, runValidators: true }
    );

    if (!habit) return res.status(404).json({ message: 'Habit not found for that date' });
    return res.json({ message: 'Habit updated', habit });
  } catch (err) {
    return next(err);
  }
}

module.exports = { addHabit, getHabits, updateHabit };


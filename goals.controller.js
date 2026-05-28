const DailyGoal = require('../models/DailyGoal');
const Habit = require('../models/Habit');
const { validateGoalsPayload, sanitizeGoalsPayload } = require('../validation/goals.validation');
const { buildGoalProgress, buildWaterReminder } = require('../utils/goalReminderUtils');

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function setGoals(req, res, next) {
  try {
    const errors = validateGoalsPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const payload = sanitizeGoalsPayload(req.body);
    const userId = req.userId;

    const goals = await DailyGoal.findOneAndUpdate(
      { userId },
      { $set: { userId, ...payload } },
      { upsert: true, new: true, runValidators: true }
    );

    return res.json({ message: 'Daily goals saved', goals });
  } catch (err) {
    return next(err);
  }
}

async function getGoals(req, res, next) {
  try {
    const goals = await DailyGoal.findOne({ userId: req.userId });
    if (!goals) {
      return res.status(404).json({ message: 'Goals not set yet' });
    }
    return res.json({ goals });
  } catch (err) {
    return next(err);
  }
}

async function getGoalProgress(req, res, next) {
  try {
    const userId = req.userId;
    const goals = await DailyGoal.findOne({ userId });
    if (!goals) return res.status(404).json({ message: 'Goals not set yet' });

    const todayHabit = await Habit.findOne({ userId, date: startOfToday() });
    const progress = buildGoalProgress(goals, todayHabit);

    return res.json({
      date: startOfToday(),
      progress,
      message: `Water: ${progress.water.current}/${progress.water.goal}L`,
    });
  } catch (err) {
    return next(err);
  }
}

async function getReminderStatus(req, res, next) {
  try {
    const userId = req.userId;
    const goals = await DailyGoal.findOne({ userId });
    if (!goals) return res.status(404).json({ message: 'Goals not set yet' });

    // Always compute live so UI reflects latest wake/sleep/progress instantly.
    const todayHabit = await Habit.findOne({ userId, date: startOfToday() });
    const live = buildWaterReminder(goals, todayHabit, new Date());
    return res.json(live);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  setGoals,
  getGoals,
  getGoalProgress,
  getReminderStatus,
};


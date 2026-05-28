const DailyGoal = require('../models/DailyGoal');
const Habit = require('../models/Habit');
const { buildWaterReminder } = require('../utils/goalReminderUtils');

const reminderCache = new Map(); // userId -> reminder status
let timer = null;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function refreshReminderCache() {
  const goals = await DailyGoal.find({});
  const today = startOfToday();

  for (const goal of goals) {
    // eslint-disable-next-line no-await-in-loop
    const todayHabit = await Habit.findOne({ userId: goal.userId, date: today });
    const status = buildWaterReminder(goal, todayHabit, new Date());
    reminderCache.set(String(goal.userId), status);
  }
}

function startReminderEngine() {
  if (timer) return;

  // initial run
  refreshReminderCache().catch((err) => {
    console.error('Reminder engine initial refresh failed:', err.message);
  });

  // refresh every 5 minutes
  timer = setInterval(() => {
    refreshReminderCache().catch((err) => {
      console.error('Reminder engine refresh failed:', err.message);
    });
  }, 5 * 60 * 1000);
}

function getReminderForUser(userId) {
  return reminderCache.get(String(userId)) || null;
}

module.exports = {
  startReminderEngine,
  getReminderForUser,
};


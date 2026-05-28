require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Habit = require('../backend/models/Habit');

function dayAtLocalMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function generatedMetrics(offset) {
  const sleep = 6.2 + (offset % 5) * 0.45;
  const water = 5 + (offset % 6);
  const meals = 2 + (offset % 2);
  const exercise = 20 + (offset % 7) * 8;
  return {
    sleep_hours: Number(sleep.toFixed(1)),
    water_intake: Number(water.toFixed(1)),
    meals,
    exercise_minutes: exercise,
  };
}

async function run() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    throw new Error('Usage: node scripts/seedHabitsForUser.js <email>');
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI missing in environment');
  }

  await mongoose.connect(mongoUri);

  const email = String(emailArg).trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const today = dayAtLocalMidnight(new Date());
  const start = addDays(today, -59); // 60 total days including today

  for (let i = 0; i < 60; i += 1) {
    const date = addDays(start, i);
    const metrics = generatedMetrics(i);

    await Habit.updateOne(
      { userId: user._id, date: dayAtLocalMidnight(date) },
      { $set: { userId: user._id, date: dayAtLocalMidnight(date), ...metrics } },
      { upsert: true }
    );
  }

  console.log(`Seeded 60 days of habits for ${email}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

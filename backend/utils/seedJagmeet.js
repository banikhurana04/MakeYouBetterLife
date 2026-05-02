const dotenv = require('dotenv');
const mongoose = require('mongoose');

const User = require('../models/User');
const Habit = require('../models/Habit');

dotenv.config();

function startOfDay(d) {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(d, amount) {
  const date = new Date(d);
  date.setDate(date.getDate() + amount);
  return date;
}

async function main() {
  const email = 'JAGMEETSINGH.230111568@gehu.ac.in'.toLowerCase();

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI missing in .env');
  }

  await mongoose.connect(process.env.MONGO_URI);

  // Create user if needed
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: 'Jagmeet',
      email,
      // You can change this after first login
      password: 'Jagmeet@123',
      lifestyle_goal: 'Consistency & energy',
      skin_type: 'Normal',
      fashion_style: 'Minimal street',
    });
    console.log('Created user:', user.email);
  } else {
    // Ensure profile has some values for the UI
    user.lifestyle_goal = user.lifestyle_goal || 'Consistency & energy';
    user.skin_type = user.skin_type || 'Normal';
    user.fashion_style = user.fashion_style || 'Minimal street';
    await user.save();
    console.log('Found user:', user.email);
  }

  const today = startOfDay(new Date());

  // Seed last 7 days (including today)
  const entries = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = startOfDay(addDays(today, -i));

    // Slight variations so charts look meaningful
    const sleep = 6.5 + (i % 3) * 0.5; // 6.5, 7.0, 7.5 pattern
    const water = 1.6 + (6 - i) * 0.2; // increasing water
    const meals = 3; // stable
    const exercise = 20 + (6 - i) * 6; // increasing exercise

    entries.push({
      userId: user._id,
      date: day,
      sleep_hours: Number(sleep.toFixed(2)),
      water_intake: Number(water.toFixed(2)),
      meals,
      exercise_minutes: exercise,
    });
  }

  for (const entry of entries) {
    // upsert by userId+date (unique index)
    // We must ensure date is exactly midnight local (we already normalized it)
    // Use $set so re-running this script is safe.
    // eslint-disable-next-line no-await-in-loop
    await Habit.findOneAndUpdate(
      { userId: entry.userId, date: entry.date },
      { $set: entry },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log('Seeded 7 days of habit data for:', user.email);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


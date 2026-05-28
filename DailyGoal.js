const mongoose = require('mongoose');

const dailyGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    water_goal: { type: Number, required: true, min: 0.5 }, // liters
    sleep_goal: { type: Number, required: true, min: 1 }, // hours
    exercise_goal: { type: Number, required: true, min: 5 }, // minutes
    wake_time: { type: String, required: true }, // HH:mm
    sleep_time: { type: String, required: true }, // HH:mm
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyGoal', dailyGoalSchema);


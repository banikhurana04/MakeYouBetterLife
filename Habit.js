const mongoose = require('mongoose');

function normalizeDate(input) {
  const d = new Date(input);
  // Normalize to midnight UTC-ish by using local midnight
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    date: {
      type: Date,
      required: true,
      index: true,
      set: normalizeDate,
    },

    sleep_hours: { type: Number, default: null },
    water_intake: { type: Number, default: null },
    meals: { type: Number, default: null },
    exercise_minutes: { type: Number, default: null },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Avoid multiple entries for the same user+day
habitSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Habit', habitSchema);


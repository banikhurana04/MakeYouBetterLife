const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },

    // Profile preferences (optional at first)
    lifestyle_goal: { type: String, trim: true, default: '' },
    skin_type: { type: String, trim: true, default: '' },
    fashion_style: { type: String, trim: true, default: '' },

    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

userSchema.pre('save', async function (next) {
  // Only hash on new password changes
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


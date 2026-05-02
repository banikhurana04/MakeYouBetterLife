const User = require('../models/User');
const { validateProfileUpdate } = require('../validation/profile.validation');

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      lifestyle_goal: user.lifestyle_goal,
      skin_type: user.skin_type,
      fashion_style: user.fashion_style,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const errors = validateProfileUpdate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { lifestyle_goal, skin_type, fashion_style } = req.body;

    // Update only provided fields
    if (lifestyle_goal !== undefined) user.lifestyle_goal = lifestyle_goal;
    if (skin_type !== undefined) user.skin_type = skin_type;
    if (fashion_style !== undefined) user.fashion_style = fashion_style;

    await user.save();

    res.json({
      message: 'Profile updated',
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        lifestyle_goal: user.lifestyle_goal,
        skin_type: user.skin_type,
        fashion_style: user.fashion_style,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const NEW_PASSWORD = 'Jagmeet@123';

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI missing in .env');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });

  const users = await User.find({}).select('+password');
  if (users.length === 0) {
    console.log('No users found.');
    await mongoose.disconnect();
    return;
  }

  for (const user of users) {
    user.password = NEW_PASSWORD;
    await user.save();
    console.log('Updated password for:', user.email);
  }

  console.log(`Done. ${users.length} user(s) now use password: ${NEW_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  if (String(err.message || '').includes('ECONNREFUSED') || err.name === 'MongooseServerSelectionError') {
    console.error(
      'Could not reach MongoDB. Start MongoDB locally or fix MONGO_URI in .env, then run npm run reset-passwords again.'
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

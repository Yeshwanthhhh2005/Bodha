/**
 * Creates a persistent test student and outputs a 365-day JWT.
 *   node scripts/createStudent.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'student@bodha.com';
  const password = 'Student@123';
  const name = 'Test Student';

  let user = await User.findOne({ email });
  if (user) {
    user.passwordHash = password;
    user.role = 'student';
    await user.save();
  } else {
    user = await User.create({ name, email, passwordHash: password, role: 'student' });
  }

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );

  console.log('\n✅ Student user ready:');
  console.log('   Email:    ', email);
  console.log('   Password: ', password);
  console.log('   _id:      ', user._id.toString());
  console.log('\n📋 REAL_TOKEN (paste into frontend/src/services/api.js & socket.js):');
  console.log('\n' + token + '\n');

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Run once to seed the admin user:
 *   node scripts/createAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.ADMIN_EMAIL || 'admin@bodha.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = 'Bodha Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = password; // will be re-hashed by pre-save hook
    await existing.save();
    console.log(`\n✅ Admin user updated:\n   Email:    ${email}\n   Password: ${password}\n`);
    await mongoose.disconnect();
    return;
  }

  await User.create({ name, email, passwordHash: password, role: 'admin' });
  console.log(`\n✅ Admin user created:\n   Email:    ${email}\n   Password: ${password}\n`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

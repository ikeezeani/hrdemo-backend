require('dotenv').config();
const { sequelize, User, Settings, LeaveType, Department } = require('../models');

// Core seeding logic — safe to call repeatedly (every check is "create only if
// missing"). Used both by `npm run seed` (CLI, below) and automatically by
// server.js on every startup, which matters specifically for hosting setups
// like cPanel's Node.js App Selector where there is no terminal available to
// run this manually — starting/restarting the app is enough to bootstrap it.
async function seedDefaults() {
  await sequelize.sync();

  // --- Company settings + currency (from environment variables) ---
  const existingSettings = await Settings.findOne();
  if (!existingSettings) {
    await Settings.create({
      company_name: process.env.COMPANY_NAME || 'My Company Ltd',
      currency_code: process.env.DEFAULT_CURRENCY || 'USD',
      currency_symbol: process.env.DEFAULT_CURRENCY_SYMBOL || '$',
      timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
      locale: process.env.DEFAULT_LOCALE || 'en-US',
      pay_frequency: process.env.PAY_FREQUENCY || 'Monthly',
      installed_at: new Date()
    });
    console.log('✔ Company settings created');
  }

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await User.create({
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
      first_name: process.env.ADMIN_FIRST_NAME || 'System',
      last_name: process.env.ADMIN_LAST_NAME || 'Administrator',
      role: 'admin'
    });
    console.log(`✔ Admin user created: ${adminEmail}`);
  }

  // --- Default departments ---
  const defaultDepartments = ['Human Resources', 'Finance', 'Engineering', 'Sales & Marketing', 'Operations'];
  for (const name of defaultDepartments) {
    await Department.findOrCreate({ where: { name } });
  }

  // --- Default leave types ---
  const defaultLeaveTypes = [
    { name: 'Annual Leave', days_per_year: 21, paid: true },
    { name: 'Sick Leave', days_per_year: 10, paid: true },
    { name: 'Maternity Leave', days_per_year: 90, paid: true },
    { name: 'Paternity Leave', days_per_year: 10, paid: true },
    { name: 'Unpaid Leave', days_per_year: 0, paid: false }
  ];
  for (const type of defaultLeaveTypes) {
    await LeaveType.findOrCreate({ where: { name: type.name }, defaults: type });
  }

  console.log('✔ Seed complete');
}

module.exports = { seedDefaults };

// Preserve the original `npm run seed` CLI behavior when run directly.
if (require.main === module) {
  seedDefaults()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('✘ Seed failed:', err);
      process.exit(1);
    });
}

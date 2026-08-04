const { sequelize, Payslip, PayrollRun, LeaveRequest, Attendance, Employee, Designation, Department } = require('../models');
const { seedDemoData } = require('../seeders/demoSeed');

// Populate demo data if not already present. Safe to call repeatedly —
// every step inside seedDemoData checks before creating anything.
exports.seedDemo = async (req, res, next) => {
  try {
    await seedDemoData();
    res.json({ message: 'Demo data seeded (or already present).' });
  } catch (err) { next(err); }
};

// Wipe all demo "content" (employees, departments, attendance, leave,
// payroll) and reseed fresh. Deliberately leaves Users and Settings
// untouched so shared demo login credentials keep working across resets.
exports.resetDemo = async (req, res, next) => {
  try {
    await sequelize.authenticate();

    await Payslip.destroy({ where: {} });
    await PayrollRun.destroy({ where: {} });
    await LeaveRequest.destroy({ where: {} });
    await Attendance.destroy({ where: {} });
    await Employee.destroy({ where: {} });
    await Designation.destroy({ where: {} });
    await Department.destroy({ where: {} });

    await seedDemoData();

    res.json({ message: 'Demo data reset and reseeded successfully.' });
  } catch (err) { next(err); }
};

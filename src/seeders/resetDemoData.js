/**
 * HRManager 5.0 — Demo Data Reset
 * Run with: node src/seeders/resetDemoData.js   (from the /backend folder)
 *
 * Wipes all "content" a prospect could have created/edited/deleted while
 * exploring the demo (employees, departments, designations, attendance,
 * leave requests, payroll runs/payslips), then re-runs demoSeed.js to
 * repopulate a fresh, realistic-looking demo company.
 *
 * Deliberately does NOT touch the Users table (admin + the 5 demo logins) —
 * those stay stable across resets so shared demo credentials keep working.
 * Does NOT touch Settings (company name/currency) either.
 *
 * Intended for a DEDICATED DEMO DATABASE only — never run this against a
 * real client's production database, it is destructive by design.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
const {
  sequelize, Payslip, PayrollRun, LeaveRequest, Attendance, Employee, Designation, Department
} = require('../models');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase()); }));
}

async function wipeContent() {
  console.log('Wiping existing demo content...');
  await Payslip.destroy({ where: {} });
  await PayrollRun.destroy({ where: {} });
  await LeaveRequest.destroy({ where: {} });
  await Attendance.destroy({ where: {} });
  await Employee.destroy({ where: {} });
  await Designation.destroy({ where: {} });
  await Department.destroy({ where: {} });
  console.log('✔ Wiped.');
}

async function main() {
  const skipConfirm = process.argv.includes('--yes');
  if (!skipConfirm) {
    const answer = await confirm(
      '\n⚠️  This will DELETE all employees, departments, attendance, leave, and payroll\n' +
      '    data in the connected database, then reseed fresh demo data.\n' +
      '    Only run this against a DEMO database, never production.\n\n' +
      '    Type "yes" to continue: '
    );
    if (answer !== 'yes') {
      console.log('Cancelled — no changes made.');
      process.exit(0);
    }
  }

  await sequelize.authenticate();
  await wipeContent();

  console.log('Reseeding fresh demo data...\n');
  execSync(`node "${path.join(__dirname, 'demoSeed.js')}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', '..')
  });

  console.log('\n✅ Demo data reset complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('✘ Reset failed:', err);
  process.exit(1);
});

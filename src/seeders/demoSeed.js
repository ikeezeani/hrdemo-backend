/**
 * HRManager 5.0 — Demo Data Seeder
 * Run with: node src/seeders/demoSeed.js   (from the /backend folder, after installation)
 *
 * Adds realistic demo data on top of what the install wizard already created:
 *   - 5 extra departments (10 total) + designations for each
 *   - 5 non-admin system users (hr, manager, employee roles), each linked to an employee
 *   - 30 employees total (realistic Nigerian names, mostly NGN salaries, a few other currencies)
 *   - ~30 days of attendance history per employee (weekdays only)
 *   - Leave requests in a mix of pending / approved / rejected states
 *   - Two payroll runs: one processed & paid (last month), one still in draft (this month)
 *
 * Safe to re-run: uses findOrCreate / existence checks so it won't duplicate data
 * if you run it more than once. Employee codes continue from whatever already exists.
 */
require('dotenv').config();
const { addDays, subDays, format, startOfMonth, endOfMonth, subMonths } = require('date-fns');
const {
  sequelize, User, Department, Designation, Employee,
  Attendance, LeaveType, LeaveRequest, PayrollRun, Payslip, Settings
} = require('../models');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad(n, width) { return String(n).padStart(width, '0'); }

const FIRST_NAMES = [
  'Chinedu', 'Ngozi', 'Emeka', 'Adaeze', 'Tunde', 'Folake', 'Ifeoma', 'Obinna', 'Amaka', 'Chukwuemeka',
  'Yetunde', 'Segun', 'Chiamaka', 'Kelechi', 'Bisi', 'Uche', 'Adaobi', 'Femi', 'Nkechi', 'Kayode',
  'Chidinma', 'Ibrahim', 'Aisha', 'Musa', 'Hauwa', 'Blessing', 'Chukwudi', 'Temitope', 'Grace', 'Ejiro',
  'Wale', 'Ozioma', 'Damilola', 'Nneka', 'Ayodele'
];
const LAST_NAMES = [
  'Okosi', 'Adeyemi', 'Chukwu', 'Balogun', 'Eze', 'Okafor', 'Nwosu', 'Bello', 'Okoro', 'Adebayo',
  'Ibe', 'Nwachukwu', 'Umeh', 'Fashola', 'Anyanwu', 'Yusuf', 'Ojo', 'Obi', 'Ekwueme', 'Lawal',
  'Chinwe', 'Uzoma', 'Ogunleye', 'Abubakar', 'Nwankwo', 'Adeleke', 'Ikenna', 'Mba', 'Aliyu', 'Chukwuma'
];

const EXTRA_DEPARTMENTS = [
  { name: 'Legal & Compliance', designations: ['Legal Counsel', 'Compliance Officer'] },
  { name: 'Health, Safety & Environment', designations: ['HSE Manager', 'Safety Officer'] },
  { name: 'Procurement', designations: ['Procurement Manager', 'Procurement Officer'] },
  { name: 'Logistics', designations: ['Logistics Coordinator', 'Fleet Supervisor'] },
  { name: 'Information Technology', designations: ['IT Manager', 'Systems Administrator', 'Support Engineer'] }
];

const BASE_DEPARTMENT_DESIGNATIONS = {
  'Human Resources': ['HR Manager', 'HR Officer', 'Recruiter'],
  'Finance': ['Finance Manager', 'Accountant', 'Payroll Officer'],
  'Engineering': ['Senior Manager', 'Field Engineer', 'Drilling Engineer'],
  'Sales & Marketing': ['Sales Manager', 'Business Development Officer'],
  'Operations': ['Operations Manager', 'Operations Supervisor']
};

const EMPLOYMENT_TYPES = ['full_time', 'full_time', 'full_time', 'contract', 'part_time'];
const CURRENCY_WEIGHTS = ['NGN', 'NGN', 'NGN', 'NGN', 'NGN', 'NGN', 'NGN', 'USD', 'GBP']; // mostly NGN, a few multi-currency
const BANKS = ['GTBank', 'Zenith Bank', 'Access Bank', 'First Bank', 'UBA', 'Fidelity Bank'];

async function ensureDepartmentsAndDesignations() {
  const deptMap = {}; // name -> { department, designations: [Designation,...] }

  // Base departments already created by install seed — just fetch + add their designations
  for (const [deptName, titles] of Object.entries(BASE_DEPARTMENT_DESIGNATIONS)) {
    const [dept] = await Department.findOrCreate({ where: { name: deptName } });
    const designations = [];
    for (const title of titles) {
      const [d] = await Designation.findOrCreate({ where: { title, department_id: dept.id } });
      designations.push(d);
    }
    deptMap[deptName] = { department: dept, designations };
  }

  // Extra departments
  for (const { name, designations: titles } of EXTRA_DEPARTMENTS) {
    const [dept] = await Department.findOrCreate({ where: { name } });
    const designations = [];
    for (const title of titles) {
      const [d] = await Designation.findOrCreate({ where: { title, department_id: dept.id } });
      designations.push(d);
    }
    deptMap[name] = { department: dept, designations };
  }

  console.log(`✔ ${Object.keys(deptMap).length} departments ready (with designations)`);
  return deptMap;
}

async function ensureNonAdminUsers() {
  const roster = [
    { first_name: 'Ngozi', last_name: 'Adebayo', email: 'ngozi.adebayo@marpe.com', role: 'hr' },
    { first_name: 'Tunde', last_name: 'Balogun', email: 'tunde.balogun@marpe.com', role: 'manager' },
    { first_name: 'Chiamaka', last_name: 'Okafor', email: 'chiamaka.okafor@marpe.com', role: 'manager' },
    { first_name: 'Ibrahim', last_name: 'Yusuf', email: 'ibrahim.yusuf@marpe.com', role: 'employee' },
    { first_name: 'Blessing', last_name: 'Eze', email: 'blessing.eze@marpe.com', role: 'employee' }
  ];

  const users = [];
  for (const u of roster) {
    let user = await User.findOne({ where: { email: u.email } });
    if (!user) {
      user = await User.create({ ...u, password: 'Demo@12345' });
      console.log(`✔ User created: ${u.email} (role: ${u.role}, password: Demo@12345)`);
    }
    users.push(user);
  }
  return users;
}

async function ensureEmployees(deptMap, linkedUsers) {
  const deptNames = Object.keys(deptMap);
  const existingCount = await Employee.count();
  const TARGET_TOTAL = 30;
  const toCreate = Math.max(0, TARGET_TOTAL - existingCount);

  if (toCreate === 0) {
    console.log(`✔ Employees already at target (${existingCount}) — skipping employee creation`);
    return await Employee.findAll();
  }

  // Figure out next available employee_code number (pattern MPOLxxx)
  const existing = await Employee.findAll({ attributes: ['employee_code'] });
  let maxNum = 0;
  for (const e of existing) {
    const m = /MPOL(\d+)/.exec(e.employee_code || '');
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }

  const usedEmails = new Set(existing.map(() => null)); // placeholder, refined below with real emails
  const allExisting = await Employee.findAll({ attributes: ['email'] });
  allExisting.forEach(e => usedEmails.add(e.email));

  let userIdx = 0;
  const created = [];

  for (let i = 0; i < toCreate; i++) {
    maxNum += 1;
    const employee_code = `MPOL${pad(maxNum, 3)}`;

    const first_name = pick(FIRST_NAMES);
    const last_name = pick(LAST_NAMES);
    let email = `${first_name}.${last_name}${maxNum}@marpe.com`.toLowerCase();
    while (usedEmails.has(email)) email = `${first_name}.${last_name}${maxNum}${randInt(1, 99)}@marpe.com`.toLowerCase();
    usedEmails.add(email);

    const deptName = pick(deptNames);
    const { department, designations } = deptMap[deptName];
    const designation = pick(designations);

    const currency = pick(CURRENCY_WEIGHTS);
    const basicSalary = currency === 'NGN'
      ? randInt(180, 950) * 1000       // ₦180,000 - ₦950,000
      : currency === 'USD'
        ? randInt(1500, 6000)          // $1,500 - $6,000
        : randInt(1200, 4500);         // £1,200 - £4,500 (GBP)

    // Link the first few employees to the 5 non-admin users created above
    let user_id = null;
    if (userIdx < linkedUsers.length) {
      user_id = linkedUsers[userIdx].id;
      userIdx += 1;
    }

    const hireDaysAgo = randInt(60, 1000); // hired between ~2 months and ~2.7 years ago

    const employee = await Employee.create({
      employee_code,
      user_id,
      first_name,
      last_name,
      email,
      phone: `080${randInt(10000000, 99999999)}`,
      gender: pick(['male', 'female']),
      date_of_birth: format(subDays(new Date(), randInt(9000, 18000)), 'yyyy-MM-dd'), // ~25-50 yrs old
      address: `${randInt(1, 200)} ${pick(['Ademola', 'Awolowo', 'Adeola Odeku', 'Ozumba Mbadiwe', 'Bourdillon'])} Street, Lagos`,
      department_id: department.id,
      designation_id: designation.id,
      date_hired: format(subDays(new Date(), hireDaysAgo), 'yyyy-MM-dd'),
      employment_type: pick(EMPLOYMENT_TYPES),
      status: Math.random() < 0.9 ? 'active' : pick(['on_leave', 'suspended']),
      bank_name: pick(BANKS),
      bank_account_number: String(randInt(1000000000, 9999999999)),
      basic_salary: basicSalary,
      currency,
      allowances: Math.round(basicSalary * 0.15),
      tax_rate_percent: 7.5,
      pension_rate_percent: 8
    });

    created.push(employee);
  }

  console.log(`✔ ${created.length} new employees created (${existingCount + created.length} total)`);
  return await Employee.findAll();
}

async function ensureAttendance(employees) {
  const today = new Date();
  let recordsCreated = 0;

  for (const emp of employees) {
    for (let d = 29; d >= 0; d--) {
      const date = subDays(today, d);
      const day = date.getDay();
      if (day === 0 || day === 6) continue; // skip weekends

      const dateStr = format(date, 'yyyy-MM-dd');
      const exists = await Attendance.findOne({ where: { employee_id: emp.id, date: dateStr } });
      if (exists) continue;

      const roll = Math.random();
      let status = 'present';
      if (roll < 0.05) status = 'absent';
      else if (roll < 0.12) status = 'late';
      else if (roll < 0.15) status = 'half_day';

      await Attendance.create({
        employee_id: emp.id,
        date: dateStr,
        clock_in: status === 'absent' ? null : `0${randInt(7, 9)}:${pad(randInt(0, 59), 2)}:00`,
        clock_out: status === 'absent' ? null : `${randInt(16, 18)}:${pad(randInt(0, 59), 2)}:00`,
        status
      });
      recordsCreated++;
    }
  }
  console.log(`✔ ${recordsCreated} attendance records created`);
}

async function ensureLeaveRequests(employees) {
  const leaveTypes = await LeaveType.findAll();
  if (!leaveTypes.length) {
    console.log('⚠ No leave types found — skipping leave requests');
    return;
  }

  const existingCount = await LeaveRequest.count();
  if (existingCount > 0) {
    console.log(`✔ Leave requests already exist (${existingCount}) — skipping`);
    return;
  }

  let created = 0;
  // Give roughly 60% of employees 1-2 leave requests each
  for (const emp of employees) {
    if (Math.random() > 0.6) continue;
    const numRequests = randInt(1, 2);

    for (let i = 0; i < numRequests; i++) {
      const leaveType = pick(leaveTypes);
      const startDaysAgo = randInt(5, 120);
      const duration = randInt(1, Math.min(5, leaveType.days_per_year || 5) || 1);
      const start = subDays(new Date(), startDaysAgo);
      const end = addDays(start, duration - 1);
      const status = pick(['approved', 'approved', 'pending', 'rejected']);

      await LeaveRequest.create({
        employee_id: emp.id,
        leave_type_id: leaveType.id,
        start_date: format(start, 'yyyy-MM-dd'),
        end_date: format(end, 'yyyy-MM-dd'),
        days: duration,
        reason: pick([
          'Family event', 'Medical appointment', 'Personal matters', 'Rest and recuperation', 'Travel'
        ]),
        status,
        decision_note: status === 'rejected' ? 'Insufficient leave balance' : null
      });
      created++;
    }
  }
  console.log(`✔ ${created} leave requests created`);
}

async function ensurePayrollHistory(employees) {
  const settings = await Settings.findOne();
  const defaultCurrency = settings?.currency_code || 'NGN';

  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
  const lastMonthLabel = format(lastMonthStart, 'yyyy-MM');

  const thisMonthStart = startOfMonth(new Date());
  const thisMonthEnd = endOfMonth(new Date());
  const thisMonthLabel = format(thisMonthStart, 'yyyy-MM');

  // --- Last month: processed + paid, with payslips ---
  let lastRun = await PayrollRun.findOne({ where: { period_label: lastMonthLabel } });
  if (!lastRun) {
    lastRun = await PayrollRun.create({
      period_label: lastMonthLabel,
      period_start: format(lastMonthStart, 'yyyy-MM-dd'),
      period_end: format(lastMonthEnd, 'yyyy-MM-dd'),
      currency: defaultCurrency,
      status: 'paid',
      processed_at: lastMonthEnd
    });
    console.log(`✔ Payroll run created: ${lastMonthLabel} (paid)`);

    let payslipCount = 0;
    for (const emp of employees) {
      if (emp.status === 'terminated') continue;
      const basic = parseFloat(emp.basic_salary || 0);
      const allowances = parseFloat(emp.allowances || 0);
      const grossPay = basic + allowances;
      const taxDeduction = grossPay * (parseFloat(emp.tax_rate_percent || 0) / 100);
      const pensionDeduction = basic * (parseFloat(emp.pension_rate_percent || 0) / 100);
      const netPay = grossPay - taxDeduction - pensionDeduction;

      await Payslip.create({
        payroll_run_id: lastRun.id,
        employee_id: emp.id,
        basic_salary: basic,
        allowances,
        gross_pay: grossPay,
        tax_deduction: taxDeduction,
        pension_deduction: pensionDeduction,
        net_pay: netPay,
        currency: emp.currency || defaultCurrency,
        days_present: randInt(18, 22),
        days_absent: randInt(0, 2)
      });
      payslipCount++;
    }
    console.log(`✔ ${payslipCount} payslips created for ${lastMonthLabel}`);
  } else {
    console.log(`✔ Payroll run for ${lastMonthLabel} already exists — skipping`);
  }

  // --- This month: still a draft, no payslips yet (so you can test "Process" yourself) ---
  const thisRun = await PayrollRun.findOne({ where: { period_label: thisMonthLabel } });
  if (!thisRun) {
    await PayrollRun.create({
      period_label: thisMonthLabel,
      period_start: format(thisMonthStart, 'yyyy-MM-dd'),
      period_end: format(thisMonthEnd, 'yyyy-MM-dd'),
      currency: defaultCurrency,
      status: 'draft'
    });
    console.log(`✔ Payroll run created: ${thisMonthLabel} (draft, ready for you to process)`);
  } else {
    console.log(`✔ Payroll run for ${thisMonthLabel} already exists — skipping`);
  }
}

async function main() {
  console.log('\n=== HRManager 5.0 — Demo Data Seeder ===\n');
  await sequelize.authenticate();

  const deptMap = await ensureDepartmentsAndDesignations();
  const users = await ensureNonAdminUsers();
  const employees = await ensureEmployees(deptMap, users);
  await ensureAttendance(employees);
  await ensureLeaveRequests(employees);
  await ensurePayrollHistory(employees);

  console.log('\n✅ Demo data ready.');
  console.log('   Non-admin logins all use the password: Demo@12345');
  console.log('   (hr: ngozi.adebayo@marpe.com, managers: tunde.balogun@marpe.com / chiamaka.okafor@marpe.com,');
  console.log('    employees: ibrahim.yusuf@marpe.com / blessing.eze@marpe.com)\n');
}

module.exports = { seedDemoData: main };

// Preserve the original `node src/seeders/demoSeed.js` CLI behavior when run directly.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('✘ Demo seed failed:', err);
      process.exit(1);
    });
}

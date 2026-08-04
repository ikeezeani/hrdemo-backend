const { PayrollRun, Payslip, Employee, Attendance, Settings } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { buildSheet, sendWorkbook } = require('../utils/xlsx');

// Create a draft payroll run for a period
exports.createRun = async (req, res, next) => {
  try {
    const { period_label, period_start, period_end } = req.body;
    const settings = await Settings.findOne();
    const run = await PayrollRun.create({
      period_label,
      period_start,
      period_end,
      currency: settings?.currency_code || 'USD',
      status: 'draft'
    });
    res.status(201).json({ data: run });
  } catch (err) { next(err); }
};

exports.listRuns = async (req, res, next) => {
  try {
    const runs = await PayrollRun.findAll({ order: [['period_start', 'DESC']] });
    res.json({ data: runs });
  } catch (err) { next(err); }
};

// Process payroll: calculate a payslip for every active employee for this run
exports.processRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status !== 'draft') return res.status(400).json({ message: 'Only draft runs can be processed' });

    const employees = await Employee.findAll({ where: { status: 'active' } });

    const results = [];
    for (const emp of employees) {
      const attendanceRecords = await Attendance.findAll({
        where: { employee_id: emp.id, date: { [Op.between]: [run.period_start, run.period_end] } }
      });
      const daysPresent = attendanceRecords.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
      const daysAbsent = attendanceRecords.filter(a => a.status === 'absent').length;

      const basic = parseFloat(emp.basic_salary || 0);
      const allowances = parseFloat(emp.allowances || 0);
      const grossPay = basic + allowances;

      const taxDeduction = grossPay * (parseFloat(emp.tax_rate_percent || 0) / 100);
      const pensionDeduction = basic * (parseFloat(emp.pension_rate_percent || 0) / 100);

      // Simple unpaid-absence deduction: per-day rate based on a 22 working-day month
      const perDayRate = basic / 22;
      const unpaidLeaveDeduction = daysAbsent > 0 ? Math.min(daysAbsent, 22) * perDayRate * 0 : 0; // configurable — off by default

      const netPay = grossPay - taxDeduction - pensionDeduction - unpaidLeaveDeduction;

      const [payslip] = await Payslip.findOrCreate({
        where: { payroll_run_id: run.id, employee_id: emp.id },
        defaults: {
          basic_salary: basic,
          allowances,
          gross_pay: grossPay,
          tax_deduction: taxDeduction,
          pension_deduction: pensionDeduction,
          unpaid_leave_deduction: unpaidLeaveDeduction,
          net_pay: netPay,
          currency: emp.currency || run.currency,
          days_present: daysPresent,
          days_absent: daysAbsent
        }
      });
      results.push(payslip);
    }

    run.status = 'processed';
    run.processed_by = req.user.id;
    run.processed_at = new Date();
    await run.save();

    res.json({ message: `Payroll processed for ${results.length} employee(s)`, data: results });
  } catch (err) { next(err); }
};

exports.markPaid = async (req, res, next) => {
  try {
    const run = await PayrollRun.findByPk(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    run.status = 'paid';
    await run.save();
    res.json({ data: run });
  } catch (err) { next(err); }
};

exports.listPayslips = async (req, res, next) => {
  try {
    const { run_id, employee_id } = req.query;
    const where = {};
    if (run_id) where.payroll_run_id = run_id;
    if (employee_id) where.employee_id = employee_id;

    const payslips = await Payslip.findAll({
      where,
      include: [
        { model: Employee, attributes: ['id', 'first_name', 'last_name', 'employee_code'] },
        { model: PayrollRun, attributes: ['period_label', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ data: payslips });
  } catch (err) { next(err); }
};

// Generate a PDF payslip for one employee
exports.downloadPayslip = async (req, res, next) => {
  try {
    const payslip = await Payslip.findByPk(req.params.id, {
      include: [Employee, PayrollRun]
    });
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    const settings = await Settings.findOne();

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslip.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text(settings?.company_name || 'Company', { align: 'center' });
    doc.fontSize(12).text(`Payslip — ${payslip.PayrollRun.period_label}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Employee: ${payslip.Employee.first_name} ${payslip.Employee.last_name} (${payslip.Employee.employee_code})`);
    doc.text(`Days Present: ${payslip.days_present}   Days Absent: ${payslip.days_absent}`);
    doc.moveDown();

    const sym = payslip.currency;
    const row = (label, val) => doc.text(`${label}: ${sym} ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    row('Basic Salary', payslip.basic_salary);
    row('Allowances', payslip.allowances);
    row('Gross Pay', payslip.gross_pay);
    row('Tax Deduction', payslip.tax_deduction);
    row('Pension Deduction', payslip.pension_deduction);
    row('Other Deductions', payslip.other_deductions);
    doc.moveDown();
    doc.fontSize(12).text(`Net Pay: ${sym} ${Number(payslip.net_pay).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, { underline: true });

    doc.end();
  } catch (err) { next(err); }
};

// --- Export: payslips as .xlsx (optionally filtered to one payroll run) ---
exports.exportPayslips = async (req, res, next) => {
  try {
    const { run_id } = req.query;
    const where = {};
    if (run_id) where.payroll_run_id = run_id;

    const payslips = await Payslip.findAll({
      where,
      include: [
        { model: Employee, attributes: ['employee_code', 'first_name', 'last_name'] },
        { model: PayrollRun, attributes: ['period_label', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    buildSheet(workbook, 'Payslips', [
      { header: 'Period', key: 'period', width: 14 },
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'Employee Name', key: 'name', width: 26 },
      { header: 'Basic Salary', key: 'basic_salary', width: 14 },
      { header: 'Allowances', key: 'allowances', width: 14 },
      { header: 'Gross Pay', key: 'gross_pay', width: 14 },
      { header: 'Tax Deduction', key: 'tax_deduction', width: 14 },
      { header: 'Pension Deduction', key: 'pension_deduction', width: 16 },
      { header: 'Net Pay', key: 'net_pay', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Days Present', key: 'days_present', width: 12 },
      { header: 'Days Absent', key: 'days_absent', width: 12 },
      { header: 'Run Status', key: 'run_status', width: 12 }
    ], payslips.map(p => ({
      period: p.PayrollRun?.period_label || '',
      employee_code: p.Employee?.employee_code || '',
      name: `${p.Employee?.first_name || ''} ${p.Employee?.last_name || ''}`.trim(),
      basic_salary: Number(p.basic_salary),
      allowances: Number(p.allowances),
      gross_pay: Number(p.gross_pay),
      tax_deduction: Number(p.tax_deduction),
      pension_deduction: Number(p.pension_deduction),
      net_pay: Number(p.net_pay),
      currency: p.currency,
      days_present: p.days_present,
      days_absent: p.days_absent,
      run_status: p.PayrollRun?.status || ''
    })));

    await sendWorkbook(res, workbook, `payslips-${Date.now()}.xlsx`);
  } catch (err) { next(err); }
};

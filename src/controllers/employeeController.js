const { Employee, Department, Designation, User } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { buildSheet, sendWorkbook, parseFirstSheetRows } = require('../utils/xlsx');

exports.list = async (req, res, next) => {
  try {
    const { search, department_id, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { employee_code: { [Op.like]: `%${search}%` } }
      ];
    }
    if (department_id) where.department_id = department_id;
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Employee.findAndCountAll({
      where,
      include: [{ model: Department }, { model: Designation }],
      limit: Number(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({ data: rows, total: count, page: Number(page), pages: Math.ceil(count / limit) });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [{ model: Department }, { model: Designation }, { model: Employee, as: 'Manager' }]
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json({ data: employee });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ data: employee });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    await employee.update(req.body);
    res.json({ data: employee });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    await employee.destroy();
    res.json({ message: 'Employee deleted' });
  } catch (err) { next(err); }
};

// --- Upload / replace an employee's passport photo ---
exports.uploadPhoto = async (req, res, next) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded. Attach an image under the field name "photo".' });

    // Best-effort cleanup of the previous photo file so uploads don't pile up.
    if (employee.photo_url) {
      const oldFilename = employee.photo_url.split('/').pop();
      const oldPath = path.join(__dirname, '..', '..', 'uploads', 'employees', oldFilename);
      fs.unlink(oldPath, () => {});
    }

    const photo_url = `/api/uploads/employees/${req.file.filename}`;
    await employee.update({ photo_url });
    res.json({ data: employee });
  } catch (err) { next(err); }
};

// --- Export: full employee list as .xlsx ---
exports.exportEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.findAll({
      include: [{ model: Department }, { model: Designation }],
      order: [['employee_code', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    buildSheet(workbook, 'Employees', [
      { header: 'Employee Code', key: 'employee_code', width: 14 },
      { header: 'First Name', key: 'first_name', width: 16 },
      { header: 'Last Name', key: 'last_name', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Date of Birth', key: 'date_of_birth', width: 14 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Designation', key: 'designation', width: 22 },
      { header: 'Date Hired', key: 'date_hired', width: 14 },
      { header: 'Employment Type', key: 'employment_type', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Basic Salary', key: 'basic_salary', width: 14 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Allowances', key: 'allowances', width: 14 },
      { header: 'Tax Rate %', key: 'tax_rate_percent', width: 12 },
      { header: 'Pension Rate %', key: 'pension_rate_percent', width: 14 },
      { header: 'Bank Name', key: 'bank_name', width: 18 },
      { header: 'Bank Account', key: 'bank_account_number', width: 18 }
    ], employees.map(e => ({
      employee_code: e.employee_code,
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      phone: e.phone || '',
      gender: e.gender || '',
      date_of_birth: e.date_of_birth || '',
      department: e.Department?.name || '',
      designation: e.Designation?.title || '',
      date_hired: e.date_hired,
      employment_type: e.employment_type,
      status: e.status,
      basic_salary: Number(e.basic_salary),
      currency: e.currency,
      allowances: Number(e.allowances),
      tax_rate_percent: Number(e.tax_rate_percent),
      pension_rate_percent: Number(e.pension_rate_percent),
      bank_name: e.bank_name || '',
      bank_account_number: e.bank_account_number || ''
    })));

    await sendWorkbook(res, workbook, `employees-${Date.now()}.xlsx`);
  } catch (err) { next(err); }
};

// --- Downloadable blank template for bulk import ---
exports.importTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    buildSheet(workbook, 'Employees Template', [
      { header: 'employee_code', key: 'employee_code', width: 14 },
      { header: 'first_name', key: 'first_name', width: 16 },
      { header: 'last_name', key: 'last_name', width: 16 },
      { header: 'email', key: 'email', width: 28 },
      { header: 'phone', key: 'phone', width: 16 },
      { header: 'gender (male/female/other)', key: 'gender', width: 24 },
      { header: 'date_of_birth (YYYY-MM-DD)', key: 'date_of_birth', width: 24 },
      { header: 'department', key: 'department', width: 22 },
      { header: 'designation', key: 'designation', width: 22 },
      { header: 'date_hired (YYYY-MM-DD)', key: 'date_hired', width: 22 },
      { header: 'employment_type (full_time/part_time/contract/intern)', key: 'employment_type', width: 34 },
      { header: 'basic_salary', key: 'basic_salary', width: 14 },
      { header: 'currency (e.g. NGN, USD)', key: 'currency', width: 22 },
      { header: 'allowances', key: 'allowances', width: 14 },
      { header: 'tax_rate_percent', key: 'tax_rate_percent', width: 16 },
      { header: 'pension_rate_percent', key: 'pension_rate_percent', width: 18 },
      { header: 'bank_name', key: 'bank_name', width: 18 },
      { header: 'bank_account_number', key: 'bank_account_number', width: 20 }
    ], [{
      employee_code: 'EMP101', first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com',
      phone: '08012345678', gender: 'female', date_of_birth: '1995-04-12', department: 'Human Resources',
      designation: 'HR Officer', date_hired: '2024-01-15', employment_type: 'full_time',
      basic_salary: 300000, currency: 'NGN', allowances: 45000, tax_rate_percent: 7.5,
      pension_rate_percent: 8, bank_name: 'GTBank', bank_account_number: '0123456789'
    }]);
    await sendWorkbook(res, workbook, 'employees-import-template.xlsx');
  } catch (err) { next(err); }
};

// --- Bulk import from an uploaded .xlsx (matches the template above) ---
// Existing employees are matched and updated by employee_code; new codes are created.
exports.importEmployees = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded. Attach a file under the field name "file".' });

    const rows = await parseFirstSheetRows(req.file.buffer);
    const departments = await Department.findAll();
    const designations = await Designation.findAll();
    const deptByName = new Map(departments.map(d => [d.name.toLowerCase(), d]));

    let created = 0, updated = 0;
    const errors = [];
    const validGenders = ['male', 'female', 'other'];
    const validEmploymentTypes = ['full_time', 'part_time', 'contract', 'intern'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for header row
      try {
        if (!row.employee_code || !row.first_name || !row.last_name || !row.email || !row.date_hired) {
          errors.push(`Row ${rowNum}: missing required field(s) — employee_code, first_name, last_name, email, and date_hired are all required`);
          continue;
        }

        let department_id = null;
        if (row.department) {
          const dept = deptByName.get(String(row.department).toLowerCase());
          if (dept) department_id = dept.id;
          else errors.push(`Row ${rowNum}: department "${row.department}" not found — left blank`);
        }

        let designation_id = null;
        if (row.designation) {
          const desig = designations.find(d =>
            d.title.toLowerCase() === String(row.designation).toLowerCase() &&
            (!department_id || d.department_id === department_id)
          );
          if (desig) designation_id = desig.id;
          else errors.push(`Row ${rowNum}: designation "${row.designation}" not found — left blank`);
        }

        const payload = {
          employee_code: String(row.employee_code).trim(),
          first_name: String(row.first_name).trim(),
          last_name: String(row.last_name).trim(),
          email: String(row.email).trim(),
          phone: row.phone ? String(row.phone).trim() : null,
          gender: validGenders.includes(row.gender) ? row.gender : null,
          date_of_birth: row.date_of_birth || null,
          department_id,
          designation_id,
          date_hired: row.date_hired,
          employment_type: validEmploymentTypes.includes(row.employment_type) ? row.employment_type : 'full_time',
          basic_salary: Number(row.basic_salary) || 0,
          currency: row.currency ? String(row.currency).toUpperCase() : 'USD',
          allowances: Number(row.allowances) || 0,
          tax_rate_percent: Number(row.tax_rate_percent) || 0,
          pension_rate_percent: Number(row.pension_rate_percent) || 0,
          bank_name: row.bank_name ? String(row.bank_name) : null,
          bank_account_number: row.bank_account_number ? String(row.bank_account_number) : null
        };

        const existing = await Employee.findOne({ where: { employee_code: payload.employee_code } });
        if (existing) {
          await existing.update(payload);
          updated++;
        } else {
          await Employee.create(payload);
          created++;
        }
      } catch (rowErr) {
        errors.push(`Row ${rowNum}: ${rowErr.message}`);
      }
    }

    res.json({
      message: `Import complete: ${created} created, ${updated} updated${errors.length ? `, ${errors.length} row issue(s)` : ''}`,
      created, updated, errors
    });
  } catch (err) { next(err); }
};

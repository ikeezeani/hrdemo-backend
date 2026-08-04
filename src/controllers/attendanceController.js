const { Attendance, Employee } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { buildSheet, sendWorkbook, parseFirstSheetRows } = require('../utils/xlsx');

exports.clockIn = async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toTimeString().slice(0, 8);

    const [record, created] = await Attendance.findOrCreate({
      where: { employee_id, date: today },
      defaults: { clock_in: now, status: 'present' }
    });
    if (!created) return res.status(400).json({ message: 'Already clocked in today' });
    res.status(201).json({ data: record });
  } catch (err) { next(err); }
};

exports.clockOut = async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const record = await Attendance.findOne({ where: { employee_id, date: today } });
    if (!record) return res.status(404).json({ message: 'No clock-in record found for today' });
    record.clock_out = new Date().toTimeString().slice(0, 8);
    await record.save();
    res.json({ data: record });
  } catch (err) { next(err); }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { employee_id, date, status, notes } = req.body;
    const [record] = await Attendance.findOrCreate({ where: { employee_id, date }, defaults: { status, notes } });
    await record.update({ status, notes });
    res.json({ data: record });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const record = await Attendance.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    await record.destroy();
    res.json({ message: 'Attendance record deleted' });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { employee_id, from, to, page = 1, limit = 31 } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (from && to) where.date = { [Op.between]: [from, to] };

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Attendance.findAndCountAll({
      where,
      include: [{ model: Employee, attributes: ['id', 'first_name', 'last_name', 'employee_code'] }],
      order: [['date', 'DESC']],
      limit: Number(limit),
      offset
    });
    res.json({ data: rows, total: count });
  } catch (err) { next(err); }
};

// --- Export: attendance records as .xlsx ---
exports.exportAttendance = async (req, res, next) => {
  try {
    const { employee_id, from, to } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (from && to) where.date = { [Op.between]: [from, to] };

    const records = await Attendance.findAll({
      where,
      include: [{ model: Employee, attributes: ['employee_code', 'first_name', 'last_name'] }],
      order: [['date', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    buildSheet(workbook, 'Attendance', [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'Employee Name', key: 'name', width: 26 },
      { header: 'Clock In', key: 'clock_in', width: 12 },
      { header: 'Clock Out', key: 'clock_out', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Notes', key: 'notes', width: 26 }
    ], records.map(r => ({
      date: r.date,
      employee_code: r.Employee?.employee_code || '',
      name: `${r.Employee?.first_name || ''} ${r.Employee?.last_name || ''}`.trim(),
      clock_in: r.clock_in || '',
      clock_out: r.clock_out || '',
      status: r.status,
      notes: r.notes || ''
    })));

    await sendWorkbook(res, workbook, `attendance-${Date.now()}.xlsx`);
  } catch (err) { next(err); }
};

// --- Downloadable blank template for bulk import ---
exports.importTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    buildSheet(workbook, 'Attendance Template', [
      { header: 'employee_code', key: 'employee_code', width: 16 },
      { header: 'date (YYYY-MM-DD)', key: 'date', width: 20 },
      { header: 'status (present/absent/late/half_day/on_leave/holiday)', key: 'status', width: 44 },
      { header: 'clock_in (HH:MM)', key: 'clock_in', width: 16 },
      { header: 'clock_out (HH:MM)', key: 'clock_out', width: 16 },
      { header: 'notes', key: 'notes', width: 26 }
    ], [{
      employee_code: 'EMP101', date: '2026-07-01', status: 'present', clock_in: '08:15', clock_out: '17:05', notes: ''
    }]);
    await sendWorkbook(res, workbook, 'attendance-import-template.xlsx');
  } catch (err) { next(err); }
};

// --- Bulk import from an uploaded .xlsx (matches the template above) ---
// One record per employee_code + date; existing records for that pair are updated in place.
exports.importAttendance = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded. Attach a file under the field name "file".' });

    const rows = await parseFirstSheetRows(req.file.buffer);
    const validStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday'];

    let created = 0, updated = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        if (!row.employee_code || !row.date) {
          errors.push(`Row ${rowNum}: missing employee_code or date`);
          continue;
        }
        const employee = await Employee.findOne({ where: { employee_code: String(row.employee_code).trim() } });
        if (!employee) {
          errors.push(`Row ${rowNum}: employee_code "${row.employee_code}" not found`);
          continue;
        }

        const status = validStatuses.includes(row.status) ? row.status : 'present';
        const dateStr = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).trim();

        const [record, wasCreated] = await Attendance.findOrCreate({
          where: { employee_id: employee.id, date: dateStr },
          defaults: {
            status,
            clock_in: row.clock_in ? String(row.clock_in) : null,
            clock_out: row.clock_out ? String(row.clock_out) : null,
            notes: row.notes ? String(row.notes) : null
          }
        });

        if (!wasCreated) {
          await record.update({
            status,
            clock_in: row.clock_in ? String(row.clock_in) : null,
            clock_out: row.clock_out ? String(row.clock_out) : null,
            notes: row.notes ? String(row.notes) : null
          });
          updated++;
        } else {
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

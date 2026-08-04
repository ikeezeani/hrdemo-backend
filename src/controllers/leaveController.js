const { LeaveType, LeaveRequest, Employee } = require('../models');
const ExcelJS = require('exceljs');
const { buildSheet, sendWorkbook } = require('../utils/xlsx');

exports.listTypes = async (req, res, next) => {
  try {
    const types = await LeaveType.findAll();
    res.json({ data: types });
  } catch (err) { next(err); }
};

exports.createType = async (req, res, next) => {
  try {
    const type = await LeaveType.create(req.body);
    res.status(201).json({ data: type });
  } catch (err) { next(err); }
};

exports.updateType = async (req, res, next) => {
  try {
    const type = await LeaveType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ message: 'Leave type not found' });
    await type.update(req.body);
    res.json({ data: type });
  } catch (err) { next(err); }
};

exports.removeType = async (req, res, next) => {
  try {
    const type = await LeaveType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ message: 'Leave type not found' });
    await type.destroy();
    res.json({ message: 'Leave type deleted' });
  } catch (err) { next(err); }
};

function calcDays(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

exports.requestLeave = async (req, res, next) => {
  try {
    const { employee_id, leave_type_id, start_date, end_date, reason } = req.body;
    const days = calcDays(start_date, end_date);
    const request = await LeaveRequest.create({
      employee_id, leave_type_id, start_date, end_date, days, reason, status: 'pending'
    });
    res.status(201).json({ data: request });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { employee_id, status } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    const requests = await LeaveRequest.findAll({
      where,
      include: [
        { model: Employee, attributes: ['id', 'first_name', 'last_name', 'employee_code'] },
        { model: LeaveType }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json({ data: requests });
  } catch (err) { next(err); }
};

exports.decide = async (req, res, next) => {
  try {
    const { status, decision_note } = req.body; // 'approved' | 'rejected'
    const request = await LeaveRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }
    await request.update({ status, decision_note, approved_by: req.user.id });
    res.json({ data: request });
  } catch (err) { next(err); }
};

// Soft-cancel: sets status to 'cancelled', preserving the request as an audit trail.
// Only makes sense for requests still pending a decision.
exports.cancel = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel a request that is already ${request.status}` });
    }
    await request.update({ status: 'cancelled' });
    res.json({ data: request });
  } catch (err) { next(err); }
};

// Hard delete: fully removes the request. Use for genuine data-entry mistakes;
// prefer Cancel for a real withdrawal, since it keeps the record for audit purposes.
exports.remove = async (req, res, next) => {
  try {
    const request = await LeaveRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Leave request not found' });
    await request.destroy();
    res.json({ message: 'Leave request deleted' });
  } catch (err) { next(err); }
};

// --- Export: leave requests as .xlsx ---
exports.exportLeaves = async (req, res, next) => {
  try {
    const { employee_id, status } = req.query;
    const where = {};
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    const requests = await LeaveRequest.findAll({
      where,
      include: [
        { model: Employee, attributes: ['employee_code', 'first_name', 'last_name'] },
        { model: LeaveType }
      ],
      order: [['start_date', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    buildSheet(workbook, 'Leave Requests', [
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'Employee Name', key: 'name', width: 26 },
      { header: 'Leave Type', key: 'type', width: 18 },
      { header: 'Start Date', key: 'start_date', width: 14 },
      { header: 'End Date', key: 'end_date', width: 14 },
      { header: 'Days', key: 'days', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Reason', key: 'reason', width: 32 }
    ], requests.map(r => ({
      employee_code: r.Employee?.employee_code || '',
      name: `${r.Employee?.first_name || ''} ${r.Employee?.last_name || ''}`.trim(),
      type: r.LeaveType?.name || '',
      start_date: r.start_date,
      end_date: r.end_date,
      days: Number(r.days),
      status: r.status,
      reason: r.reason || ''
    })));

    await sendWorkbook(res, workbook, `leave-requests-${Date.now()}.xlsx`);
  } catch (err) { next(err); }
};

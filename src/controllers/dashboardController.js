const { Employee, Department, LeaveRequest, PayrollRun, Attendance } = require('../models');

exports.summary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [totalEmployees, activeEmployees, totalDepartments, pendingLeaves, todayAttendance, lastRun] =
      await Promise.all([
        Employee.count(),
        Employee.count({ where: { status: 'active' } }),
        Department.count(),
        LeaveRequest.count({ where: { status: 'pending' } }),
        Attendance.count({ where: { date: today, status: ['present', 'late'] } }),
        PayrollRun.findOne({ order: [['period_start', 'DESC']] })
      ]);

    res.json({
      data: {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        pendingLeaves,
        presentToday: todayAttendance,
        lastPayrollRun: lastRun
      }
    });
  } catch (err) { next(err); }
};

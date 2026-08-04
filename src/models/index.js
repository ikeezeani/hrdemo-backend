const sequelize = require('../config/db');
const User = require('./User');
const Department = require('./Department');
const Designation = require('./Designation');
const Employee = require('./Employee');
const Attendance = require('./Attendance');
const { LeaveType, LeaveRequest } = require('./Leave');
const { PayrollRun, Payslip } = require('./Payroll');
const Settings = require('./Settings');

// --- Associations ---
Department.hasMany(Designation, { foreignKey: 'department_id' });
Designation.belongsTo(Department, { foreignKey: 'department_id' });

Department.hasMany(Employee, { foreignKey: 'department_id' });
Employee.belongsTo(Department, { foreignKey: 'department_id' });

Designation.hasMany(Employee, { foreignKey: 'designation_id' });
Employee.belongsTo(Designation, { foreignKey: 'designation_id' });

Employee.belongsTo(Employee, { as: 'Manager', foreignKey: 'manager_id' });
Employee.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Employee, { foreignKey: 'user_id' });

Employee.hasMany(Attendance, { foreignKey: 'employee_id' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id' });

Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id' });
LeaveType.hasMany(LeaveRequest, { foreignKey: 'leave_type_id' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id' });

PayrollRun.hasMany(Payslip, { foreignKey: 'payroll_run_id', onDelete: 'CASCADE' });
Payslip.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id' });
Employee.hasMany(Payslip, { foreignKey: 'employee_id' });
Payslip.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = {
  sequelize,
  User,
  Department,
  Designation,
  Employee,
  Attendance,
  LeaveType,
  LeaveRequest,
  PayrollRun,
  Payslip,
  Settings
};

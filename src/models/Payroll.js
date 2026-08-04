const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One payroll "run" per pay period (e.g. July 2026)
const PayrollRun = sequelize.define('PayrollRun', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  period_label: { type: DataTypes.STRING, allowNull: false }, // e.g. "2026-07"
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'processed', 'paid', 'cancelled'), defaultValue: 'draft' },
  processed_by: { type: DataTypes.INTEGER, allowNull: true },
  processed_at: { type: DataTypes.DATE, allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' }
}, {
  tableName: 'payroll_runs',
  indexes: [{ unique: true, fields: ['period_label'] }]
});

// One payslip per employee per run
const Payslip = sequelize.define('Payslip', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payroll_run_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  basic_salary: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  allowances: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  overtime_pay: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  bonus: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  gross_pay: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  tax_deduction: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  pension_deduction: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  other_deductions: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  unpaid_leave_deduction: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  net_pay: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
  days_present: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  days_absent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'payslips',
  indexes: [{ unique: true, fields: ['payroll_run_id', 'employee_id'] }]
});

module.exports = { PayrollRun, Payslip };

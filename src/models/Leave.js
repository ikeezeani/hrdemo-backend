const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LeaveType = sequelize.define('LeaveType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  days_per_year: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  paid: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'leave_types' });

const LeaveRequest = sequelize.define('LeaveRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  leave_type_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  days: { type: DataTypes.DECIMAL(5, 1), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'), defaultValue: 'pending' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  decision_note: { type: DataTypes.STRING, allowNull: true }
}, { tableName: 'leave_requests' });

module.exports = { LeaveType, LeaveRequest };

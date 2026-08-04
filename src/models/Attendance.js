const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  clock_in: { type: DataTypes.TIME, allowNull: true },
  clock_out: { type: DataTypes.TIME, allowNull: true },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday'),
    defaultValue: 'present'
  },
  notes: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'attendance',
  indexes: [{ unique: true, fields: ['employee_id', 'date'] }]
});

module.exports = Attendance;

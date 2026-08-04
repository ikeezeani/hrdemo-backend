const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_code: { type: DataTypes.STRING, allowNull: false, unique: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true }, // linked login account, optional
  first_name: { type: DataTypes.STRING, allowNull: false },
  last_name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING, allowNull: true },
  gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
  date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  department_id: { type: DataTypes.INTEGER, allowNull: true },
  designation_id: { type: DataTypes.INTEGER, allowNull: true },
  manager_id: { type: DataTypes.INTEGER, allowNull: true },
  date_hired: { type: DataTypes.DATEONLY, allowNull: false },
  employment_type: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern'),
    defaultValue: 'full_time'
  },
  status: { type: DataTypes.ENUM('active', 'on_leave', 'suspended', 'terminated'), defaultValue: 'active' },
  bank_name: { type: DataTypes.STRING, allowNull: true },
  bank_account_number: { type: DataTypes.STRING, allowNull: true },
  basic_salary: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
  allowances: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  tax_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  pension_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  photo_url: { type: DataTypes.STRING, allowNull: true }
}, { tableName: 'employees' });

module.exports = Employee;

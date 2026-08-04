const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'departments' });

module.exports = Department;

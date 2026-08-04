const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Designation = sequelize.define('Designation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  department_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'designations' });

module.exports = Designation;

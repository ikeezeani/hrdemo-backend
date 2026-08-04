const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Singleton-style key/value settings table so Settings can be changed
// from the UI after installation without editing .env / restarting.
const Settings = sequelize.define('Settings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'My Company Ltd' },
  company_logo_url: { type: DataTypes.STRING, allowNull: true },
  currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
  currency_symbol: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '$' },
  timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'UTC' },
  locale: { type: DataTypes.STRING, allowNull: false, defaultValue: 'en-US' },
  pay_frequency: {
    type: DataTypes.ENUM('Monthly', 'Bi-Weekly', 'Weekly'),
    allowNull: false,
    defaultValue: 'Monthly'
  },
  fiscal_year_start_month: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  installed_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'settings' });

module.exports = Settings;

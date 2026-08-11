const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Generic "HR asked to delete something, Admin approved/rejected it" record.
// Only 'designation' is wired up today, but resource_type is intentionally
// open-ended so the same approval flow can cover other resources later
// (e.g. leave types, departments) without a new table.
const DeletionRequest = sequelize.define('DeletionRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  resource_type: { type: DataTypes.ENUM('designation'), allowNull: false },
  resource_id: { type: DataTypes.INTEGER, allowNull: false },
  // Snapshot of the item's name at request time, so the request list stays
  // readable even after the item is deleted (once approved).
  resource_label: { type: DataTypes.STRING, allowNull: true },
  reason: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  requested_by: { type: DataTypes.INTEGER, allowNull: false },
  reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  review_note: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'deletion_requests'
});

module.exports = DeletionRequest;
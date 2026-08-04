const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  first_name: { type: DataTypes.STRING, allowNull: false },
  last_name: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('admin', 'hr', 'manager', 'employee'),
    allowNull: false,
    defaultValue: 'employee'
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
      user.password = await bcrypt.hash(user.password, rounds);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
        user.password = await bcrypt.hash(user.password, rounds);
      }
    }
  }
});

User.prototype.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

User.prototype.toSafeJSON = function () {
  const { password, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;

const { User, Employee } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] }, order: [['created_at', 'DESC']] });
    res.json({ data: users });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { employee_id, ...userFields } = req.body;

    const existing = await User.findOne({ where: { email: userFields.email } });
    if (existing) {
      return res.status(400).json({ message: `A user with the email "${userFields.email}" already exists.` });
    }

    const user = await User.create(userFields);

    if (employee_id) {
      const employee = await Employee.findByPk(employee_id);
      if (employee) await employee.update({ user_id: user.id });
    }

    res.status(201).json({ data: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.email && req.body.email !== user.email) {
      const existing = await User.findOne({ where: { email: req.body.email } });
      if (existing) {
        return res.status(400).json({ message: `A user with the email "${req.body.email}" already exists.` });
      }
    }

    await user.update(req.body);
    res.json({ data: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

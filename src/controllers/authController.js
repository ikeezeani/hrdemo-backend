const jwt = require('jsonwebtoken');
const { User } = require('../models');

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.is_active) return res.status(403).json({ message: 'This account has been deactivated' });

    user.last_login = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) { next(err); }
};

exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    const valid = await req.user.comparePassword(current_password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    req.user.password = new_password;
    await req.user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
};

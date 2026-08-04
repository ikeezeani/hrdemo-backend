const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid or inactive account' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// authorize('admin', 'hr') -> only these roles may proceed
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };

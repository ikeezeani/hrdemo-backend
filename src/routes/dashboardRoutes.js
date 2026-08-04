const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, ctrl.summary);

module.exports = router;

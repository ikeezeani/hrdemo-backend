const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/currencies', ctrl.currencies); // public — used by install wizard too
router.get('/', authenticate, ctrl.get);
router.put('/', authenticate, authorize('admin'), ctrl.update);

module.exports = router;

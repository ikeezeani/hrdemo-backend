const router = require('express').Router();
const ctrl = require('../controllers/deletionRequestController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// HR submits a request; Admin doesn't need this endpoint since Admin can
// already delete directly (see departmentRoutes.js).
router.post('/', authorize('hr'), ctrl.create);

router.get('/', authorize('admin'), ctrl.list);
router.post('/:id/approve', authorize('admin'), ctrl.approve);
router.post('/:id/reject', authorize('admin'), ctrl.reject);

module.exports = router;
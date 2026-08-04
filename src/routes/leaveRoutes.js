const router = require('express').Router();
const ctrl = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/types', ctrl.listTypes);
router.post('/types', authorize('admin', 'hr'), ctrl.createType);
router.put('/types/:id', authorize('admin', 'hr'), ctrl.updateType);
router.delete('/types/:id', authorize('admin', 'hr'), ctrl.removeType);
router.get('/export', authorize('admin', 'hr', 'manager'), ctrl.exportLeaves);
router.get('/', ctrl.list);
router.post('/', ctrl.requestLeave);
router.put('/:id/decision', authorize('admin', 'hr', 'manager'), ctrl.decide);
router.put('/:id/cancel', authorize('admin', 'hr', 'manager'), ctrl.cancel);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;

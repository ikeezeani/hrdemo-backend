const router = require('express').Router();
const ctrl = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/export', authorize('admin', 'hr', 'manager'), ctrl.exportAttendance);
router.get('/import-template', authorize('admin', 'hr'), ctrl.importTemplate);
router.post('/import', authorize('admin', 'hr'), upload.single('file'), ctrl.importAttendance);
router.post('/clock-in', ctrl.clockIn);
router.post('/clock-out', ctrl.clockOut);
router.post('/mark', authorize('admin', 'hr', 'manager'), ctrl.markAttendance);
router.delete('/:id', authorize('admin', 'hr'), ctrl.remove);

module.exports = router;

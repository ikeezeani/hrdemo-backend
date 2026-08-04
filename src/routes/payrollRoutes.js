const router = require('express').Router();
const ctrl = require('../controllers/payrollController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/runs', ctrl.listRuns);
router.post('/runs', authorize('admin', 'hr'), ctrl.createRun);
router.post('/runs/:id/process', authorize('admin', 'hr'), ctrl.processRun);
router.post('/runs/:id/mark-paid', authorize('admin', 'hr'), ctrl.markPaid);
router.get('/payslips', ctrl.listPayslips);
router.get('/payslips/export', authorize('admin', 'hr'), ctrl.exportPayslips);
router.get('/payslips/:id/download', ctrl.downloadPayslip);

module.exports = router;

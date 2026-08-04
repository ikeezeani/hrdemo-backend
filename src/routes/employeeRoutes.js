const router = require('express').Router();
const ctrl = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadPhoto = require('../middleware/uploadPhoto');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/export', authorize('admin', 'hr'), ctrl.exportEmployees);
router.get('/import-template', authorize('admin', 'hr'), ctrl.importTemplate);
router.post('/import', authorize('admin', 'hr'), upload.single('file'), ctrl.importEmployees);
router.get('/:id', ctrl.get);
router.post('/', authorize('admin', 'hr'), ctrl.create);
router.put('/:id', authorize('admin', 'hr'), ctrl.update);
router.post('/:id/photo', authorize('admin', 'hr'), uploadPhoto.single('photo'), ctrl.uploadPhoto);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;

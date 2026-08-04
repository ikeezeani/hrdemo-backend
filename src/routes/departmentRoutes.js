const router = require('express').Router();
const ctrl = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.listDepartments);
router.post('/', authorize('admin', 'hr'), ctrl.createDepartment);
router.put('/:id', authorize('admin', 'hr'), ctrl.updateDepartment);
router.delete('/:id', authorize('admin'), ctrl.removeDepartment);

router.get('/designations/all', ctrl.listDesignations);
router.post('/designations', authorize('admin', 'hr'), ctrl.createDesignation);
router.put('/designations/:id', authorize('admin', 'hr'), ctrl.updateDesignation);
router.delete('/designations/:id', authorize('admin'), ctrl.removeDesignation);

module.exports = router;

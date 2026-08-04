const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const demoAuth = require('../middleware/demoAuth');

// Note: intentionally uses demoAuth (a shared secret token), not the normal
// authenticate/authorize middleware — this must be triggerable without ever
// logging into the app, e.g. via curl from the deployer's own machine, on
// hosting with no server terminal access (see docs/DEMO_SETUP.md).
router.post('/seed-demo', demoAuth, ctrl.seedDemo);
router.post('/reset-demo', demoAuth, ctrl.resetDemo);

module.exports = router;

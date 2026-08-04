// Protects demo maintenance endpoints (seed/reset) with a secret token that
// only the deployer knows — deliberately NOT tied to any user's login,
// since on a demo deployment the prospect also holds a valid Admin login
// and must not be able to trigger a full data wipe just by being logged in.
//
// If DEMO_ADMIN_TOKEN is not set at all (the normal case for a real client's
// production deployment), these endpoints are disabled outright — returning
// 404 rather than 401/403, so their existence isn't even revealed.
module.exports = function demoAuth(req, res, next) {
  const configuredToken = process.env.DEMO_ADMIN_TOKEN;
  if (!configuredToken) {
    return res.status(404).json({ message: 'Route not found' });
  }
  const providedToken = req.headers['x-demo-token'];
  if (providedToken !== configuredToken) {
    return res.status(401).json({ message: 'Invalid or missing demo token' });
  }
  next();
};

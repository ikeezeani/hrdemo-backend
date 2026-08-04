// Centralized error handler — keep API responses consistent and never leak stack traces in production.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors?.map(e => ({ field: e.path, message: e.message }))
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;

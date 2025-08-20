/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (err.code === 'ECONNREFUSED') {
    status = 503;
    message = 'Service unavailable';
    code = 'SERVICE_UNAVAILABLE';
  } else if (err.status) {
    status = err.status;
    message = err.message || message;
    code = err.code || code;
  }

  // Don't leak error details in production
  const errorResponse = {
    error: message,
    code: code
  };

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      message: err.message,
      stack: err.stack,
      name: err.name
    };
  }

  res.status(status).json(errorResponse);
};

/**
 * Async error wrapper to catch async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
};
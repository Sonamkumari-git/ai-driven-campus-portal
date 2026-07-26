function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.statusCode || error.status || 500;
  const message = error.code === 11000
    ? 'Duplicate record already exists.'
    : error.message || 'Server error';
  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };

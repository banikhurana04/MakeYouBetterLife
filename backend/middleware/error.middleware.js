function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _ = next;
  console.error(err);

  const status = err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  // Mongoose duplicate key errors
  if (err && err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate entry.' });
  }

  res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };


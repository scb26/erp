function notFound(req, res, next) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
}

module.exports = notFound;

function errorHandler(error, req, res, next) {
  console.error(error);

  if (error && error.code === "ER_DUP_ENTRY") {
    return res.status(400).json({
      success: false,
      message: "Duplicate value found for a unique field"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}

module.exports = errorHandler;

function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors
  });
}

function validateVendor(req, res, next) {
  const errors = [];
  const body = req.body || {};

  if (!body.name || String(body.name).trim().length < 2) {
    errors.push("Vendor name is required and must be at least 2 characters.");
  }

  if (!body.phone || !/^[0-9]{10,15}$/.test(String(body.phone).trim())) {
    errors.push("Phone is required and must be 10 to 15 digits.");
  }

  if (!body.state || String(body.state).trim().length < 2) {
    errors.push("State is required.");
  }

  if (body.gstin && !/^[0-9A-Z]{15}$/.test(String(body.gstin).trim().toUpperCase())) {
    errors.push("GSTIN must be 15 uppercase alphanumeric characters.");
  }

  if (body.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(body.pan).trim().toUpperCase())) {
    errors.push("PAN must be in valid format.");
  }

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
    errors.push("Email must be valid.");
  }

  if (body.opening_balance !== undefined && Number.isNaN(Number(body.opening_balance))) {
    errors.push("Opening balance must be numeric.");
  }

  if (errors.length) {
    return sendValidationError(res, errors);
  }

  req.body = {
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    address: body.address ? String(body.address).trim() : null,
    gstin: body.gstin ? String(body.gstin).trim().toUpperCase() : null,
    state: String(body.state).trim(),
    pan: body.pan ? String(body.pan).trim().toUpperCase() : null,
    email: body.email ? String(body.email).trim() : null,
    opening_balance: body.opening_balance !== undefined ? Number(body.opening_balance) : 0,
    is_active: body.is_active === undefined ? 1 : Number(Boolean(body.is_active))
  };

  return next();
}

module.exports = validateVendor;

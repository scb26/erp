const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^\d{6}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i;
const CUSTOMER_TYPES = ["Individual", "Business"];

function validateIdParam(req, res, next) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: "Customer id must be a valid positive integer"
    });
  }

  return next();
}

function validateCreateCustomer(req, res, next) {
  return validateCustomerPayload(req, res, next, false);
}

function validateUpdateCustomer(req, res, next) {
  return validateCustomerPayload(req, res, next, true);
}

function validateCustomerPayload(req, res, next, isUpdate) {
  const payload = req.body || {};
  const errors = [];
  const sanitized = {};

  validateName(payload, errors, sanitized, isUpdate);
  validateMobile(payload, errors, sanitized, isUpdate);
  validateCustomerType(payload, errors, sanitized, isUpdate);
  validateOptionalString(payload, "company_name", sanitized);
  validateOptionalString(payload, "address", sanitized);
  validateGstNumber(payload, errors, sanitized);
  validateNumberField(payload, "opening_balance", sanitized, errors, isUpdate, 0);
  validateNumberField(payload, "credit_limit", sanitized, errors, true, null);
  validateEmail(payload, errors, sanitized);
  validateOptionalString(payload, "city", sanitized);
  validateOptionalString(payload, "state", sanitized);
  validatePincode(payload, errors, sanitized);

  if (isUpdate && !Object.keys(sanitized).length) {
    errors.push("At least one valid field is required to update the customer");
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  req.validatedCustomer = sanitized;
  return next();
}

function validateName(payload, errors, sanitized, isUpdate) {
  if (payload.name === undefined && isUpdate) {
    return;
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (name.length < 2) {
    errors.push("Name is required and must be at least 2 characters");
    return;
  }

  sanitized.name = name;
}

function validateMobile(payload, errors, sanitized, isUpdate) {
  if (payload.mobile === undefined && isUpdate) {
    return;
  }

  const mobile = String(payload.mobile || "").trim();

  if (!MOBILE_REGEX.test(mobile)) {
    errors.push("Mobile number must be a valid 10-digit Indian mobile number");
    return;
  }

  sanitized.mobile = mobile;
}

function validateCustomerType(payload, errors, sanitized, isUpdate) {
  if (payload.customer_type === undefined && isUpdate) {
    return;
  }

  const customerType = payload.customer_type || "Individual";

  if (!CUSTOMER_TYPES.includes(customerType)) {
    errors.push("Customer type must be either Individual or Business");
    return;
  }

  sanitized.customer_type = customerType;
}

function validateOptionalString(payload, key, sanitized) {
  if (payload[key] === undefined) {
    return;
  }

  const value = String(payload[key] || "").trim();
  sanitized[key] = value || null;
}

function validateGstNumber(payload, errors, sanitized) {
  if (payload.gst_number === undefined) {
    return;
  }

  const gstNumber = String(payload.gst_number || "").trim().toUpperCase();

  if (!gstNumber) {
    sanitized.gst_number = null;
    return;
  }

  if (!GST_REGEX.test(gstNumber)) {
    errors.push("GST number must be a valid Indian GST format");
    return;
  }

  sanitized.gst_number = gstNumber;
}

function validateNumberField(payload, key, sanitized, errors, isOptional, defaultValue) {
  if (payload[key] === undefined) {
    if (!isOptional && defaultValue !== null) {
      sanitized[key] = defaultValue;
    }
    return;
  }

  if (payload[key] === null || payload[key] === "") {
    sanitized[key] = defaultValue;
    return;
  }

  const numericValue = Number(payload[key]);

  if (Number.isNaN(numericValue)) {
    errors.push(`${friendlyFieldName(key)} must be a valid number`);
    return;
  }

  sanitized[key] = numericValue;
}

function validateEmail(payload, errors, sanitized) {
  if (payload.email === undefined) {
    return;
  }

  const email = String(payload.email || "").trim().toLowerCase();

  if (!email) {
    sanitized.email = null;
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.push("Email must be a valid email address");
    return;
  }

  sanitized.email = email;
}

function validatePincode(payload, errors, sanitized) {
  if (payload.pincode === undefined) {
    return;
  }

  const pincode = String(payload.pincode || "").trim();

  if (!pincode) {
    sanitized.pincode = null;
    return;
  }

  if (!PINCODE_REGEX.test(pincode)) {
    errors.push("Pincode must be exactly 6 digits");
    return;
  }

  sanitized.pincode = pincode;
}

function friendlyFieldName(field) {
  return field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
  validateIdParam,
  validateCreateCustomer,
  validateUpdateCustomer
};

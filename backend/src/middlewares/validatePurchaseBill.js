function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors
  });
}

function normalizeItems(rawItems, errors) {
  if (rawItems === undefined) {
    return undefined;
  }

  if (!Array.isArray(rawItems)) {
    errors.push("Items must be an array.");
    return [];
  }

  return rawItems.map((item, index) => {
    const normalized = {
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      purchase_rate: Number(item.purchase_rate),
      gst_rate: Number(item.gst_rate),
      line_total: Number(item.line_total)
    };

    if (!normalized.product_id || normalized.product_id < 1) {
      errors.push(`Item ${index + 1}: product_id is required.`);
    }

    if (!normalized.quantity || normalized.quantity <= 0) {
      errors.push(`Item ${index + 1}: quantity must be greater than zero.`);
    }

    if (Number.isNaN(normalized.purchase_rate) || normalized.purchase_rate < 0) {
      errors.push(`Item ${index + 1}: purchase_rate must be a valid non-negative number.`);
    }

    if (Number.isNaN(normalized.gst_rate) || normalized.gst_rate < 0) {
      errors.push(`Item ${index + 1}: gst_rate must be a valid non-negative number.`);
    }

    if (Number.isNaN(normalized.line_total) || normalized.line_total < 0) {
      errors.push(`Item ${index + 1}: line_total must be a valid non-negative number.`);
    }

    return normalized;
  });
}

function validatePurchaseBill(req, res, next) {
  const body = req.body || {};
  const errors = [];

  if (!body.bill_number || String(body.bill_number).trim().length < 3) {
    errors.push("Bill number is required.");
  }

  if (!body.bill_date) {
    errors.push("Bill date is required.");
  }

  if (!body.vendor_id || Number(body.vendor_id) < 1) {
    errors.push("Vendor ID is required.");
  }

  ["subtotal", "total_gst", "grand_total", "amount_paid"].forEach((fieldName) => {
    if (body[fieldName] !== undefined && Number.isNaN(Number(body[fieldName]))) {
      errors.push(`${fieldName} must be numeric.`);
    }
  });

  if (!["cash", "upi", "bank", "mixed"].includes(body.payment_method)) {
    errors.push("Payment method must be one of cash, upi, bank, or mixed.");
  }

  if (body.status && !["paid", "partial", "unpaid"].includes(body.status)) {
    errors.push("Status must be one of paid, partial, or unpaid.");
  }

  const items = normalizeItems(body.items, errors);

  if (errors.length) {
    return sendValidationError(res, errors);
  }

  req.body = {
    bill_number: String(body.bill_number).trim(),
    bill_date: body.bill_date,
    vendor_id: Number(body.vendor_id),
    subtotal: Number(body.subtotal),
    total_gst: Number(body.total_gst),
    grand_total: Number(body.grand_total),
    amount_paid: body.amount_paid !== undefined ? Number(body.amount_paid) : 0,
    payment_method: body.payment_method,
    status: body.status || "unpaid",
    notes: body.notes ? String(body.notes).trim() : null,
    items
  };

  return next();
}

module.exports = validatePurchaseBill;

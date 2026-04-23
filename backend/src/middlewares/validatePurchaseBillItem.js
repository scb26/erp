function sendValidationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors
  });
}

function validatePurchaseBillItem(req, res, next) {
  const body = req.body || {};
  const errors = [];

  if (!body.purchase_bill_id || Number(body.purchase_bill_id) < 1) {
    errors.push("purchase_bill_id is required.");
  }

  if (!body.product_id || Number(body.product_id) < 1) {
    errors.push("product_id is required.");
  }

  if (!body.quantity || Number(body.quantity) <= 0) {
    errors.push("quantity must be greater than zero.");
  }

  if (Number.isNaN(Number(body.purchase_rate)) || Number(body.purchase_rate) < 0) {
    errors.push("purchase_rate must be a valid non-negative number.");
  }

  if (Number.isNaN(Number(body.gst_rate)) || Number(body.gst_rate) < 0) {
    errors.push("gst_rate must be a valid non-negative number.");
  }

  if (Number.isNaN(Number(body.line_total)) || Number(body.line_total) < 0) {
    errors.push("line_total must be a valid non-negative number.");
  }

  if (errors.length) {
    return sendValidationError(res, errors);
  }

  req.body = {
    purchase_bill_id: Number(body.purchase_bill_id),
    product_id: Number(body.product_id),
    quantity: Number(body.quantity),
    purchase_rate: Number(body.purchase_rate),
    gst_rate: Number(body.gst_rate),
    line_total: Number(body.line_total)
  };

  return next();
}

module.exports = validatePurchaseBillItem;

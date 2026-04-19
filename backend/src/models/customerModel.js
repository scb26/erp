const { query } = require("../db/mysql");

const SELECT_FIELDS = `
  id,
  name,
  mobile,
  customer_type,
  company_name,
  address,
  gst_number,
  opening_balance,
  credit_limit,
  email,
  city,
  state,
  pincode,
  created_at
`;

function normalizeCustomerRecord(record) {
  if (!record) {
    return null;
  }

  return Object.assign({}, record, {
    customer_name: record.name,
    phone: record.mobile,
    gstin: record.gst_number,
    state_name: record.state,
    postal_code: record.pincode
  });
}

async function createCustomer(customer) {
  const sql = `
    INSERT INTO customers (
      name,
      mobile,
      customer_type,
      company_name,
      address,
      gst_number,
      opening_balance,
      credit_limit,
      email,
      city,
      state,
      pincode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    customer.name,
    customer.mobile,
    customer.customer_type,
    customer.company_name,
    customer.address,
    customer.gst_number,
    customer.opening_balance,
    customer.credit_limit,
    customer.email,
    customer.city,
    customer.state,
    customer.pincode
  ]);

  return getCustomerById(result.insertId);
}

async function getAllCustomers() {
  const sql = `SELECT ${SELECT_FIELDS} FROM customers ORDER BY created_at DESC, id DESC`;
  const rows = await query(sql);
  return rows.map(normalizeCustomerRecord);
}

async function getCustomerById(id) {
  const sql = `SELECT ${SELECT_FIELDS} FROM customers WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return normalizeCustomerRecord(rows[0] || null);
}

async function getCustomerByMobile(mobile, excludeId = null) {
  let sql = `SELECT ${SELECT_FIELDS} FROM customers WHERE mobile = ?`;
  const params = [mobile];

  if (excludeId !== null) {
    sql += " AND id <> ?";
    params.push(excludeId);
  }

  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return normalizeCustomerRecord(rows[0] || null);
}

async function updateCustomer(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }

  if (updates.mobile !== undefined) {
    fields.push("mobile = ?");
    values.push(updates.mobile);
  }

  if (updates.customer_type !== undefined) {
    fields.push("customer_type = ?");
    values.push(updates.customer_type);
  }

  if (updates.company_name !== undefined) {
    fields.push("company_name = ?");
    values.push(updates.company_name);
  }

  if (updates.address !== undefined) {
    fields.push("address = ?");
    values.push(updates.address);
  }

  if (updates.gst_number !== undefined) {
    fields.push("gst_number = ?");
    values.push(updates.gst_number);
  }

  if (updates.opening_balance !== undefined) {
    fields.push("opening_balance = ?");
    values.push(updates.opening_balance);
  }

  if (updates.credit_limit !== undefined) {
    fields.push("credit_limit = ?");
    values.push(updates.credit_limit);
  }

  if (updates.email !== undefined) {
    fields.push("email = ?");
    values.push(updates.email);
  }

  if (updates.city !== undefined) {
    fields.push("city = ?");
    values.push(updates.city);
  }

  if (updates.state !== undefined) {
    fields.push("state = ?");
    values.push(updates.state);
  }

  if (updates.pincode !== undefined) {
    fields.push("pincode = ?");
    values.push(updates.pincode);
  }

  if (!fields.length) {
    return getCustomerById(id);
  }

  const sql = `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`;
  values.push(id);

  await query(sql, values);
  return getCustomerById(id);
}

async function deleteCustomer(id) {
  const sql = "DELETE FROM customers WHERE id = ?";
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  getCustomerByMobile,
  updateCustomer,
  deleteCustomer
};

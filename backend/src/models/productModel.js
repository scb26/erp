const { query } = require("../db/mysql");

const SELECT_FIELDS = `
  id,
  name,
  barcode,
  hsn,
  price,
  gst_rate,
  stock,
  created_at
`;

function normalizeProductRecord(record) {
  if (!record) return null;

  return {
    id: record.id,
    name: record.name,
    barcode: record.barcode,
    hsn: record.hsn,
    price: record.price,
    gstRate: record.gst_rate,
    stock: record.stock,
    createdAt: record.created_at
  };
}

async function createProduct(product) {
  const sql = `
    INSERT INTO products (
      name,
      barcode,
      hsn,
      price,
      gst_rate,
      stock
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    product.name,
    product.barcode || "",
    product.hsn || "",
    product.price || 0,
    product.gstRate || 0,
    product.stock || 0
  ]);

  return getProductById(result.insertId);
}

async function getAllProducts() {
  const sql = `SELECT ${SELECT_FIELDS} FROM products ORDER BY created_at DESC`;
  const rows = await query(sql);
  return rows.map(normalizeProductRecord);
}

async function getProductById(id) {
  const sql = `SELECT ${SELECT_FIELDS} FROM products WHERE id = ? LIMIT 1`;
  const rows = await query(sql, [id]);
  return normalizeProductRecord(rows[0] || null);
}

async function updateProduct(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.barcode !== undefined) {
    fields.push("barcode = ?");
    values.push(updates.barcode);
  }
  if (updates.hsn !== undefined) {
    fields.push("hsn = ?");
    values.push(updates.hsn);
  }
  if (updates.price !== undefined) {
    fields.push("price = ?");
    values.push(updates.price);
  }
  if (updates.gstRate !== undefined) {
    fields.push("gst_rate = ?");
    values.push(updates.gstRate);
  }
  if (updates.stock !== undefined) {
    fields.push("stock = ?");
    values.push(updates.stock);
  }

  if (!fields.length) return getProductById(id);

  const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
  values.push(id);

  await query(sql, values);
  return getProductById(id);
}

async function deleteProduct(id) {
  const sql = "DELETE FROM products WHERE id = ?";
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
};

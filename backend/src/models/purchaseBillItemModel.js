const pool = require("../db/mysql");

function normalizeItem(row) {
  return {
    id: row.id,
    purchase_bill_id: row.purchase_bill_id,
    product_id: row.product_id,
    product_name: row.product_name || null,
    quantity: Number(row.quantity || 0),
    purchase_rate: Number(row.purchase_rate || 0),
    gst_rate: Number(row.gst_rate || 0),
    line_total: Number(row.line_total || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function syncProductPurchaseFacts(connection, purchaseBillId, item) {
  const [billRows] = await connection.execute(
    `SELECT bill_date
     FROM purchase_bills
     WHERE id = ?`,
    [purchaseBillId]
  );

  if (!billRows.length) {
    return;
  }

  await connection.execute(
    `UPDATE products
     SET
       purchase_price = ?,
       last_purchase_date = ?
     WHERE id = ?`,
    [item.purchase_rate, billRows[0].bill_date, item.product_id]
  );
}

async function getAllPurchaseBillItems() {
  const [rows] = await pool.execute(
    `SELECT
       pbi.*,
       p.product_name
     FROM purchase_bill_items pbi
     LEFT JOIN products p ON p.id = pbi.product_id
     ORDER BY pbi.id DESC`
  );

  return rows.map(normalizeItem);
}

async function getPurchaseBillItemById(id) {
  const [rows] = await pool.execute(
    `SELECT
       pbi.*,
       p.product_name
     FROM purchase_bill_items pbi
     LEFT JOIN products p ON p.id = pbi.product_id
     WHERE pbi.id = ?`,
    [id]
  );

  return rows.length ? normalizeItem(rows[0]) : null;
}

async function createPurchaseBillItem(payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO purchase_bill_items (
         purchase_bill_id,
         product_id,
         quantity,
         purchase_rate,
         gst_rate,
         line_total
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.purchase_bill_id,
        payload.product_id,
        payload.quantity,
        payload.purchase_rate,
        payload.gst_rate,
        payload.line_total
      ]
    );

    await syncProductPurchaseFacts(connection, payload.purchase_bill_id, payload);
    await connection.commit();

    return getPurchaseBillItemById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updatePurchaseBillItem(id, payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE purchase_bill_items
       SET
         purchase_bill_id = ?,
         product_id = ?,
         quantity = ?,
         purchase_rate = ?,
         gst_rate = ?,
         line_total = ?
       WHERE id = ?`,
      [
        payload.purchase_bill_id,
        payload.product_id,
        payload.quantity,
        payload.purchase_rate,
        payload.gst_rate,
        payload.line_total,
        id
      ]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      return null;
    }

    await syncProductPurchaseFacts(connection, payload.purchase_bill_id, payload);
    await connection.commit();

    return getPurchaseBillItemById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deletePurchaseBillItem(id) {
  const [result] = await pool.execute(
    `DELETE FROM purchase_bill_items
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  getAllPurchaseBillItems,
  getPurchaseBillItemById,
  createPurchaseBillItem,
  updatePurchaseBillItem,
  deletePurchaseBillItem
};

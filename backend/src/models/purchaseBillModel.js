const pool = require("../db/mysql");

function normalizeBillRow(row) {
  return {
    id: row.id,
    bill_number: row.bill_number,
    bill_date: row.bill_date,
    vendor_id: row.vendor_id,
    vendor_name: row.vendor_name || null,
    subtotal: Number(row.subtotal || 0),
    total_gst: Number(row.total_gst || 0),
    grand_total: Number(row.grand_total || 0),
    amount_paid: Number(row.amount_paid || 0),
    payment_method: row.payment_method,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function normalizeBillItemRow(row) {
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

async function syncProductPurchaseFacts(connection, billDate, items) {
  if (!items || !items.length) {
    return;
  }

  for (const item of items) {
    await connection.execute(
      `UPDATE products
       SET
         purchase_price = ?,
         last_purchase_date = ?
       WHERE id = ?`,
      [item.purchase_rate, billDate, item.product_id]
    );
  }
}

async function insertItems(connection, purchaseBillId, items) {
  if (!items || !items.length) {
    return;
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    await connection.execute(
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
        purchaseBillId,
        item.product_id,
        item.quantity,
        item.purchase_rate,
        item.gst_rate,
        item.line_total
      ]
    );
  }
}

async function getAllPurchaseBills() {
  const [rows] = await pool.execute(
    `SELECT
       pb.*,
       v.name AS vendor_name,
       COUNT(pbi.id) AS item_count
     FROM purchase_bills pb
     INNER JOIN vendors v ON v.id = pb.vendor_id
     LEFT JOIN purchase_bill_items pbi ON pbi.purchase_bill_id = pb.id
     GROUP BY pb.id, v.name
     ORDER BY pb.bill_date DESC, pb.id DESC`
  );

  return rows.map((row) => ({
    ...normalizeBillRow(row),
    item_count: Number(row.item_count || 0)
  }));
}

async function getPurchaseBillById(id) {
  const [billRows] = await pool.execute(
    `SELECT
       pb.*,
       v.name AS vendor_name
     FROM purchase_bills pb
     INNER JOIN vendors v ON v.id = pb.vendor_id
     WHERE pb.id = ?`,
    [id]
  );

  if (!billRows.length) {
    return null;
  }

  const [itemRows] = await pool.execute(
    `SELECT
       pbi.*,
       p.product_name
     FROM purchase_bill_items pbi
     LEFT JOIN products p ON p.id = pbi.product_id
     WHERE pbi.purchase_bill_id = ?
     ORDER BY pbi.id ASC`,
    [id]
  );

  return {
    ...normalizeBillRow(billRows[0]),
    items: itemRows.map(normalizeBillItemRow)
  };
}

async function createPurchaseBill(payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO purchase_bills (
         bill_number,
         bill_date,
         vendor_id,
         subtotal,
         total_gst,
         grand_total,
         amount_paid,
         payment_method,
         status,
         notes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.bill_number,
        payload.bill_date,
        payload.vendor_id,
        payload.subtotal,
        payload.total_gst,
        payload.grand_total,
        payload.amount_paid ?? 0,
        payload.payment_method,
        payload.status || "unpaid",
        payload.notes || null
      ]
    );

    await insertItems(connection, result.insertId, payload.items);
    await syncProductPurchaseFacts(connection, payload.bill_date, payload.items);

    await connection.commit();
    return getPurchaseBillById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updatePurchaseBill(id, payload) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE purchase_bills
       SET
         bill_number = ?,
         bill_date = ?,
         vendor_id = ?,
         subtotal = ?,
         total_gst = ?,
         grand_total = ?,
         amount_paid = ?,
         payment_method = ?,
         status = ?,
         notes = ?
       WHERE id = ?`,
      [
        payload.bill_number,
        payload.bill_date,
        payload.vendor_id,
        payload.subtotal,
        payload.total_gst,
        payload.grand_total,
        payload.amount_paid ?? 0,
        payload.payment_method,
        payload.status || "unpaid",
        payload.notes || null,
        id
      ]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      return null;
    }

    if (Array.isArray(payload.items)) {
      await connection.execute(
        `DELETE FROM purchase_bill_items
         WHERE purchase_bill_id = ?`,
        [id]
      );

      await insertItems(connection, id, payload.items);
      await syncProductPurchaseFacts(connection, payload.bill_date, payload.items);
    }

    await connection.commit();
    return getPurchaseBillById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deletePurchaseBill(id) {
  const [result] = await pool.execute(
    `DELETE FROM purchase_bills
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  getAllPurchaseBills,
  getPurchaseBillById,
  createPurchaseBill,
  updatePurchaseBill,
  deletePurchaseBill
};

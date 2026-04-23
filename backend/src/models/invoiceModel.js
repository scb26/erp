const { pool, query } = require("../db/mysql");

async function createInvoice(invoice) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert into invoices table
    const invoiceSql = `
      INSERT INTO invoices (
        invoice_number,
        invoice_date,
        customer_id,
        customer_name,
        total_amount,
        tax_amount,
        grand_total,
        paid_amount,
        balance_due,
        payment_method,
        status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [invoiceResult] = await connection.execute(invoiceSql, [
      invoice.invoiceNumber,
      invoice.date,
      invoice.customerId,
      invoice.customerName,
      invoice.totalAmount || 0,
      invoice.taxAmount || 0,
      invoice.grandTotal || 0,
      invoice.paidAmount || 0,
      invoice.balanceDue || 0,
      invoice.paymentMethod || "Cash",
      invoice.status || "unpaid",
      invoice.notes || ""
    ]);

    const invoiceId = invoiceResult.insertId;

    // 2. Insert line items
    if (invoice.items && invoice.items.length > 0) {
      const itemSql = `
        INSERT INTO invoice_items (
          invoice_id,
          product_id,
          product_name,
          quantity,
          rate,
          gst_rate,
          tax_amount,
          total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of invoice.items) {
        await connection.execute(itemSql, [
          invoiceId,
          item.productId,
          item.name,
          item.qty,
          item.rate,
          item.gstRate || 0,
          item.taxAmount || 0,
          item.total || 0
        ]);

        // 3. Update product stock (decrement)
        if (item.productId) {
          await connection.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [item.qty, item.productId]
          );
        }
      }
    }

    await connection.commit();
    return invoiceId;
  } catch (err) {
    // TODO: Handle stock reversal if this was an update/cancellation flow
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getAllInvoices() {
  const sql = `
    SELECT 
      id, invoice_number, invoice_date, customer_name, grand_total, status, created_at 
    FROM invoices 
    ORDER BY created_at DESC
  `;
  return await query(sql);
}

async function getInvoiceById(id) {
  // Get invoice header
  const headerSql = "SELECT * FROM invoices WHERE id = ? LIMIT 1";
  const headers = await query(headerSql, [id]);
  if (headers.length === 0) return null;

  const invoice = headers[0];

  // Get invoice items
  const itemsSql = "SELECT * FROM invoice_items WHERE invoice_id = ?";
  invoice.items = await query(itemsSql, [id]);

  return invoice;
}

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById
};

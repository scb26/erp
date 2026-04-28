/**
 * @module models/invoiceModel
 * @description Database operations for Sales Invoices and Line Items. 
 * Handles multi-table transactions for invoices and stock updates.
 */
const { pool, query } = require("../db/mysql");

async function createInvoice(invoice) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert into invoices table
    const invoiceSql = `
      INSERT INTO invoices (
        company_id,
        invoice_number,
        invoice_date,
        customer_id,
        place_of_supply_state,
        supply_type,
        notes,
        subtotal_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        grand_total_amount,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const totals = invoice.totals || {};
    const companyId = invoice.company?.id || 1; // Default to 1 if not provided
    const placeOfSupply = invoice.customer?.state || "";
    const supplyType = (invoice.company?.state === invoice.customer?.state) ? "intra_state" : "inter_state";

    const [invoiceResult] = await connection.execute(invoiceSql, [
      companyId,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      invoice.customer?.id,
      placeOfSupply,
      supplyType,
      invoice.notes || "",
      totals.subtotal || 0,
      totals.cgst || 0,
      totals.sgst || 0,
      totals.igst || 0,
      totals.grandTotal || 0,
      invoice.paymentStatus || "draft"
    ]);

    const invoiceId = invoiceResult.insertId;

    // 2. Insert line items
    if (invoice.items && invoice.items.length > 0) {
      const itemSql = `
        INSERT INTO invoice_items (
          invoice_id,
          product_id,
          line_number,
          item_name,
          hsn_sac_code,
          quantity,
          unit_rate,
          gst_rate,
          taxable_value,
          line_total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (var i = 0; i < invoice.items.length; i++) {
        var item = invoice.items[i];
        var taxableValue = (item.quantity || 0) * (item.rate || 0);
        var taxAmount = taxableValue * (item.gstRate || 0) / 100;
        var lineTotal = taxableValue + taxAmount;

        await connection.execute(itemSql, [
          invoiceId,
          item.productId,
          i + 1,
          item.name,
          item.hsn || "",
          item.quantity || 0,
          item.rate || 0,
          item.gstRate || 0,
          taxableValue,
          lineTotal
        ]);

        // 3. Update product stock (decrement)
        if (item.productId) {
          await connection.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.productId]
          );
        }
      }
    }

    await connection.commit();
    return invoiceId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function getAllInvoices() {
  const sql = `
    SELECT 
      id, invoice_number, invoice_date, grand_total_amount as grand_total, status, created_at 
    FROM invoices 
    ORDER BY created_at DESC
  `;
  return await query(sql);
}

async function getInvoiceById(id) {
  // Get invoice header
  const headerSql = "SELECT *, grand_total_amount as grand_total FROM invoices WHERE id = ? LIMIT 1";
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

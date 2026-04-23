const Invoice = require("../models/invoiceModel");

async function getAllInvoices(req, res) {
  try {
    const invoices = await Invoice.getAllInvoices();
    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getInvoiceById(req, res) {
  try {
    const invoice = await Invoice.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: "Invoice not found" });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error("Error fetching invoice:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function createInvoice(req, res) {
  try {
    const { customerId, customerName, items } = req.body;
    
    if (!customerName || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Customer and items are required" });
    }

    const invoiceId = await Invoice.createInvoice(req.body);
    res.status(201).json({ success: true, data: { id: invoiceId } });
  } catch (err) {
    console.error("Error creating invoice:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice
};

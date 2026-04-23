const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const customerRoutes = require("./routes/customerRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const purchaseBillRoutes = require("./routes/purchaseBillRoutes");
const purchaseBillItemRoutes = require("./routes/purchaseBillItemRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve Frontend Files
const frontendPath = path.join(__dirname, "../../"); 
app.use(express.static(frontendPath));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Unidex backend is healthy."
  });
});

// Root route to serve the ERP homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use("/customers", customerRoutes);
app.use("/vendors", vendorRoutes);
app.use("/purchase-bills", purchaseBillRoutes);
app.use("/purchase-bill-items", purchaseBillItemRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/invoices", invoiceRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, _req, res, _next) => {
  if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
    return res.status(400).json({
      success: false,
      message: "Duplicate value violates a unique constraint.",
      error: error.sqlMessage || error.message
    });
  }

  if (error && (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452)) {
    return res.status(400).json({
      success: false,
      message: "Referenced record does not exist.",
      error: error.sqlMessage || error.message
    });
  }

  if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
    return res.status(400).json({
      success: false,
      message: "This record is still in use and cannot be deleted.",
      error: error.sqlMessage || error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
    error: error && error.message ? error.message : "Unknown error"
  });
});

module.exports = app;

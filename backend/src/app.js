const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const customerRoutes = require("./routes/customerRoutes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Global middleware for JSON APIs.
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Customer module backend is running"
  });
});

app.use("/customers", customerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

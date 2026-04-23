const Product = require("../models/productModel");

async function getAllProducts(req, res) {
  try {
    const products = await Product.getAllProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getProductById(req, res) {
  try {
    const product = await Product.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function createProduct(req, res) {
  try {
    const { name, price, gstRate, stock } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Product name is required" });
    }

    const newProduct = await Product.createProduct(req.body);
    res.status(201).json({ success: true, data: newProduct });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function updateProduct(req, res) {
  try {
    const updated = await Product.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function deleteProduct(req, res) {
  try {
    const success = await Product.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

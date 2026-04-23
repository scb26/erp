const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

router.get("/", inventoryController.getAllProducts);
router.get("/:id", inventoryController.getProductById);
router.post("/", inventoryController.createProduct);
router.put("/:id", inventoryController.updateProduct);
router.delete("/:id", inventoryController.deleteProduct);

module.exports = router;

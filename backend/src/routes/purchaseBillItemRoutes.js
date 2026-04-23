const express = require("express");
const purchaseBillItemController = require("../controllers/purchaseBillItemController");
const validatePurchaseBillItem = require("../middlewares/validatePurchaseBillItem");

const router = express.Router();

router.post("/", validatePurchaseBillItem, purchaseBillItemController.createPurchaseBillItem);
router.get("/", purchaseBillItemController.getAllPurchaseBillItems);
router.get("/:id", purchaseBillItemController.getPurchaseBillItemById);
router.put("/:id", validatePurchaseBillItem, purchaseBillItemController.updatePurchaseBillItem);
router.delete("/:id", purchaseBillItemController.deletePurchaseBillItem);

module.exports = router;

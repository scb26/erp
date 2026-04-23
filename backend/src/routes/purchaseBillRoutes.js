const express = require("express");
const purchaseBillController = require("../controllers/purchaseBillController");
const validatePurchaseBill = require("../middlewares/validatePurchaseBill");

const router = express.Router();

router.post("/", validatePurchaseBill, purchaseBillController.createPurchaseBill);
router.get("/", purchaseBillController.getAllPurchaseBills);
router.get("/:id", purchaseBillController.getPurchaseBillById);
router.put("/:id", validatePurchaseBill, purchaseBillController.updatePurchaseBill);
router.delete("/:id", purchaseBillController.deletePurchaseBill);

module.exports = router;

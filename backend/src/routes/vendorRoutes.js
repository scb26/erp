const express = require("express");
const vendorController = require("../controllers/vendorController");
const validateVendor = require("../middlewares/validateVendor");

const router = express.Router();

router.post("/", validateVendor, vendorController.createVendor);
router.get("/", vendorController.getAllVendors);
router.get("/:id", vendorController.getVendorById);
router.put("/:id", validateVendor, vendorController.updateVendor);
router.delete("/:id", vendorController.deleteVendor);

module.exports = router;

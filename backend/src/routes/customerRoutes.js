const express = require("express");

const customerController = require("../controllers/customerController");
const { validateCreateCustomer, validateUpdateCustomer, validateIdParam } = require("../middlewares/validateCustomer");

const router = express.Router();

router.post("/", validateCreateCustomer, customerController.createCustomer);
router.get("/", customerController.listCustomers);
router.get("/:id", validateIdParam, customerController.getCustomer);
router.put("/:id", validateIdParam, validateUpdateCustomer, customerController.updateCustomer);
router.delete("/:id", validateIdParam, customerController.deleteCustomer);

module.exports = router;

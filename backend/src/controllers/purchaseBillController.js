const purchaseBillModel = require("../models/purchaseBillModel");

async function createPurchaseBill(req, res, next) {
  try {
    const bill = await purchaseBillModel.createPurchaseBill(req.body);
    return res.status(201).json({
      success: true,
      message: "Purchase bill created successfully.",
      data: bill
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllPurchaseBills(_req, res, next) {
  try {
    const bills = await purchaseBillModel.getAllPurchaseBills();
    return res.status(200).json({
      success: true,
      data: bills
    });
  } catch (error) {
    return next(error);
  }
}

async function getPurchaseBillById(req, res, next) {
  try {
    const bill = await purchaseBillModel.getPurchaseBillById(Number(req.params.id));

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePurchaseBill(req, res, next) {
  try {
    const bill = await purchaseBillModel.updatePurchaseBill(Number(req.params.id), req.body);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase bill updated successfully.",
      data: bill
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePurchaseBill(req, res, next) {
  try {
    const deleted = await purchaseBillModel.deletePurchaseBill(Number(req.params.id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase bill deleted successfully."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPurchaseBill,
  getAllPurchaseBills,
  getPurchaseBillById,
  updatePurchaseBill,
  deletePurchaseBill
};

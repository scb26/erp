const purchaseBillItemModel = require("../models/purchaseBillItemModel");

async function createPurchaseBillItem(req, res, next) {
  try {
    const item = await purchaseBillItemModel.createPurchaseBillItem(req.body);
    return res.status(201).json({
      success: true,
      message: "Purchase bill item created successfully.",
      data: item
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllPurchaseBillItems(_req, res, next) {
  try {
    const items = await purchaseBillItemModel.getAllPurchaseBillItems();
    return res.status(200).json({
      success: true,
      data: items
    });
  } catch (error) {
    return next(error);
  }
}

async function getPurchaseBillItemById(req, res, next) {
  try {
    const item = await purchaseBillItemModel.getPurchaseBillItemById(Number(req.params.id));

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill item not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePurchaseBillItem(req, res, next) {
  try {
    const item = await purchaseBillItemModel.updatePurchaseBillItem(Number(req.params.id), req.body);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill item not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase bill item updated successfully.",
      data: item
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePurchaseBillItem(req, res, next) {
  try {
    const deleted = await purchaseBillItemModel.deletePurchaseBillItem(Number(req.params.id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Purchase bill item not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase bill item deleted successfully."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPurchaseBillItem,
  getAllPurchaseBillItems,
  getPurchaseBillItemById,
  updatePurchaseBillItem,
  deletePurchaseBillItem
};

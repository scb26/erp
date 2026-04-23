const vendorModel = require("../models/vendorModel");

async function createVendor(req, res, next) {
  try {
    const vendor = await vendorModel.createVendor(req.body);
    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      data: vendor
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllVendors(_req, res, next) {
  try {
    const vendors = await vendorModel.getAllVendors();
    return res.status(200).json({
      success: true,
      data: vendors
    });
  } catch (error) {
    return next(error);
  }
}

async function getVendorById(req, res, next) {
  try {
    const vendor = await vendorModel.getVendorById(Number(req.params.id));

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    return next(error);
  }
}

async function updateVendor(req, res, next) {
  try {
    const vendor = await vendorModel.updateVendor(Number(req.params.id), req.body);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully.",
      data: vendor
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteVendor(req, res, next) {
  try {
    const deleted = await vendorModel.deleteVendor(Number(req.params.id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully."
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor
};

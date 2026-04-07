const customerModel = require("../models/customerModel");

async function createCustomer(req, res, next) {
  try {
    const existingCustomer = await customerModel.getCustomerByMobile(req.validatedCustomer.mobile);

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer with this mobile number already exists"
      });
    }

    const customer = await customerModel.createCustomer(req.validatedCustomer);

    return res.status(200).json({
      success: true,
      message: "Customer created successfully",
      data: customer
    });
  } catch (error) {
    return next(error);
  }
}

async function listCustomers(req, res, next) {
  try {
    const customers = await customerModel.getAllCustomers();

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customers
    });
  } catch (error) {
    return next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await customerModel.getCustomerById(Number(req.params.id));

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully",
      data: customer
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const customerId = Number(req.params.id);
    const existingCustomer = await customerModel.getCustomerById(customerId);

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (req.validatedCustomer.mobile) {
      const customerWithSameMobile = await customerModel.getCustomerByMobile(
        req.validatedCustomer.mobile,
        customerId
      );

      if (customerWithSameMobile) {
        return res.status(400).json({
          success: false,
          message: "Customer with this mobile number already exists"
        });
      }
    }

    const updatedCustomer = await customerModel.updateCustomer(customerId, req.validatedCustomer);

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const customerId = Number(req.params.id);
    const customer = await customerModel.getCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    await customerModel.deleteCustomer(customerId);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
};

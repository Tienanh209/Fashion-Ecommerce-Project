const suppliersService = require("../services/suppliers.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

async function listSuppliers(req, res, next) {
  try {
    const suppliers = await suppliersService.listSuppliers();
    return res.json(JSend.success({ suppliers }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "Failed to load suppliers"));
  }
}

async function createSupplier(req, res, next) {
  const name = req.body?.name;
  const address = req.body?.address || "";
  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new ApiError(400, "Supplier name is required"));
  }
  try {
    const supplier = await suppliersService.createSupplier({
      name,
      address: typeof address === "string" ? address : "",
    });
    return res
      .status(201)
      .json(
        JSend.success({
          supplier,
        })
      );
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "Failed to create supplier"));
  }
}

module.exports = {
  listSuppliers,
  createSupplier,
};

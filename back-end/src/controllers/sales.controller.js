const salesService = require("../services/sales.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

async function listSales(req, res, next) {
  try {
    const sales = await salesService.listSales();
    return res.json(JSend.success({ sales }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "Failed to fetch sales"));
  }
}

async function getSale(req, res, next) {
  const { sale_id } = req.params;
  try {
    const sale = await salesService.getSale(sale_id);
    if (!sale) return next(new ApiError(404, "Sale not found"));
    return res.json(JSend.success({ sale }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, `Failed to fetch sale ${sale_id}`));
  }
}

async function createSale(req, res, next) {
  try {
    const sale = await salesService.createSale({
      ...(req.body || {}),
      banner_url: req.file ? `/public/uploads/${req.file.filename}` : req.body?.banner_url,
    });
    if (!sale || !sale.sale_id) {
      return next(new ApiError(500, "Failed to create sale"));
    }
    return res
      .status(201)
      .set({ Location: `${req.baseUrl}/${sale.sale_id}` })
      .json(JSend.success({ sale }));
  } catch (error) {
    console.log(error);
    const message = error?.message || "Failed to create sale";
    return next(new ApiError(400, message));
  }
}

async function updateSale(req, res, next) {
  const { sale_id } = req.params;
  try {
    const sale = await salesService.updateSale(sale_id, {
      ...(req.body || {}),
      banner_url: req.file ? `/public/uploads/${req.file.filename}` : req.body?.banner_url,
    });
    if (!sale) return next(new ApiError(404, "Sale not found"));
    return res.json(JSend.success({ sale }));
  } catch (error) {
    console.log(error);
    const message = error?.message || "Failed to update sale";
    return next(new ApiError(400, message));
  }
}

async function deleteSale(req, res, next) {
  const { sale_id } = req.params;
  try {
    const deleted = await salesService.deleteSale(sale_id);
    if (!deleted) return next(new ApiError(404, "Sale not found"));
    return res.json(JSend.success());
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, `Failed to delete sale ${sale_id}`));
  }
}

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
};

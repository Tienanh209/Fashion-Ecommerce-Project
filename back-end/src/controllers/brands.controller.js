const brandsService = require("../services/brands.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// GET /brands
async function listBrands(_req, res, next) {
  try {
    const brands = await brandsService.listBrands();
    return res.json(JSend.success({ brands }));
  } catch (e) {
    return next(new ApiError(500, "An error occurred while retrieving brands"));
  }
}

// GET /brands/:brand_id
async function getBrand(req, res, next) {
  const { brand_id } = req.params;
  try {
    const brand = await brandsService.getBrand(brand_id);
    if (!brand) return next(new ApiError(404, "Brand not found"));
    return res.json(JSend.success({ brand }));
  } catch (e) {
    return next(
      new ApiError(500, `Error retrieving brand with id=${brand_id}`)
    );
  }
}

// POST /brands
async function createBrand(req, res, next) {
  const { name } = req.body || {};
  if (!name) return next(new ApiError(400, "name is required"));
  try {
    const brand = await brandsService.createBrand({ name });
    return res.status(201).json(JSend.success({ brand }));
  } catch (e) {
    return next(new ApiError(500, "An error occurred while creating brand"));
  }
}

// PUT /brands/:brand_id
async function updateBrand(req, res, next) {
  const { brand_id } = req.params;
  const { name } = req.body || {};
  if (!name) return next(new ApiError(400, "name is required"));
  try {
    const brand = await brandsService.updateBrand(brand_id, { name });
    if (!brand) return next(new ApiError(404, "Brand not found"));
    return res.json(JSend.success({ brand }));
  } catch (e) {
    return next(new ApiError(500, `Error updating brand with id=${brand_id}`));
  }
}

// DELETE /brands/:brand_id
async function deleteBrand(req, res, next) {
  const { brand_id } = req.params;
  try {
    const deleted = await brandsService.deleteBrand(brand_id);
    if (!deleted) return next(new ApiError(404, "Brand not found"));
    return res.json(JSend.success());
  } catch (e) {
    return next(
      new ApiError(500, `Could not delete brand with id=${brand_id}`)
    );
  }
}

module.exports = {
  listBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
};

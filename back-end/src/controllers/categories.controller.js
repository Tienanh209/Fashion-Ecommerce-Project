const categoriesService = require("../services/categories.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// POST: /categories
async function addCategory(req, res, next) {
  const name = req.body?.name;
  if (!name || typeof name !== "string") {
    return next(new ApiError(400, "Name should be a non-empty string"));
  }

  try {
    const category = await categoriesService.addCategory({ name });
    return res.status(201).json(JSend.success({ category }));
  } catch (error) {
    console.error(error);
    console.log(...req.body);
    return next(
      new ApiError(500, "An error occurred while adding the category")
    );
  }
}

// GET: /categories
async function getCategories(req, res, next) {
  try {
    const categories = await categoriesService.getCategories();
    return res.json(JSend.success({ categories }));
  } catch (error) {
    console.error(error);
    return next(
      new ApiError(500, "An error occurred while retrieving categories")
    );
  }
}

// PUT: /categories/:category_id
async function updateCategory(req, res, next) {
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new ApiError(400, "Data to update can not be empty"));
  }

  const category_id = Number.parseInt(req.params.category_id, 10);
  if (!Number.isInteger(category_id)) {
    return next(new ApiError(400, "Invalid category id"));
  }

  const { name } = req.body;
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return next(new ApiError(400, "Name should be a non-empty string"));
  }

  try {
    const updated = await categoriesService.updateCategory(category_id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
    });
    if (!updated) return next(new ApiError(404, "Category not found"));
    return res.json(JSend.success({ category: updated }));
  } catch (error) {
    console.error(error);
    return next(
      new ApiError(500, `Error updating category with id=${category_id}`)
    );
  }
}

// DELETE: /categories/:category_id
async function deleteCategory(req, res, next) {
  const category_id = Number.parseInt(req.params.category_id, 10);
  if (!Number.isInteger(category_id)) {
    return next(new ApiError(400, "Invalid category id"));
  }

  try {
    const deleted = await categoriesService.deleteCategory(category_id);
    if (!deleted) return next(new ApiError(404, "Category not found"));
    return res.status(204).end();
  } catch (error) {
    console.error(error);
    return next(
      new ApiError(500, `Could not delete category with id=${category_id}`)
    );
  }
}

module.exports = {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};

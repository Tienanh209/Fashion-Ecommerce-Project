const favoritesService = require("../services/favorites.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

async function listFavorites(req, res, next) {
  const { user_id } = req.params;
  try {
    const favorites = await favoritesService.listFavorites(user_id);
    return res.json(JSend.success({ favorites }));
  } catch (error) {
    console.error(error);
    return next(
      new ApiError(500, `An error occurred while retrieving favorites for user_id=${user_id}`)
    );
  }
}

async function addFavorite(req, res, next) {
  const { user_id } = req.params;
  const { product_id } = req.body || {};
  if (!product_id) {
    return next(new ApiError(400, "product_id is required"));
  }
  try {
    const favorite = await favoritesService.addFavorite(user_id, product_id);
    return res.status(201).json(JSend.success({ favorite }));
  } catch (error) {
    console.error(error);
    if (/product not found/i.test(error.message)) {
      return next(new ApiError(404, error.message));
    }
    if (/invalid (user|product)_id/i.test(error.message)) {
      return next(new ApiError(400, error.message));
    }
    return next(new ApiError(500, "Failed to add favorite"));
  }
}

async function removeFavorite(req, res, next) {
  const { user_id, product_id } = req.params;
  try {
    const deleted = await favoritesService.removeFavorite(user_id, product_id);
    if (!deleted) return next(new ApiError(404, "Favorite not found"));
    return res.json(JSend.success());
  } catch (error) {
    console.error(error);
    if (/invalid (user|product)_id/i.test(error.message)) {
      return next(new ApiError(400, error.message));
    }
    return next(new ApiError(500, "Failed to remove favorite"));
  }
}

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite,
};

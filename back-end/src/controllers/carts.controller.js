const cartsService = require("../services/carts.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// GET: /carts/:user_id
async function getCartItems(req, res, next) {
  const { user_id } = req.params;
  try {
    const cart_items = await cartsService.getCartItems(user_id);
    if (!cart_items) return next(new ApiError(404, "Cart items not found"));
    return res.json(JSend.success({ user_id, cart_items }));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(500, `Error retrieving cart of user's id=${user_id}`)
    );
  }
}

// POST: /carts/:user_id/items
async function addItem(req, res, next) {
  const { user_id } = req.params;
  try {
    const { variant_id, quantity } = req.body || {};
    if (!Number.isInteger(+variant_id) || !Number.isInteger(+quantity))
      return next(new ApiError(400, "variant_id & quantity must be integers"));
    const data = await cartsService.addItem(user_id, {
      variant_id: +variant_id,
      quantity: +quantity,
    });
    return res.status(201).json(JSend.success(data));
  } catch (e) {
    console.error(e);
    if (/Variant not found/i.test(e?.message))
      return next(new ApiError(404, e.message));
    next(new ApiError(500, "Add to cart failed"));
  }
}

// PATCH: /carts/:user_id/items/:cart_item_id
async function updateItem(req, res, next) {
  try {
    const data = await cartsService.updateItem(
      +req.params.user_id,
      +req.params.cart_item_id,
      { quantity: +req.body.quantity }
    );
    if (!data) return next(new ApiError(404, "Cart item not found"));
    return res.json(JSend.success(data));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Update cart item failed"));
  }
}

// DELETE: /carts/:user_id/items/:cart_item_id
async function removeItem(req, res, next) {
  try {
    const ok = await cartsService.removeItem(
      +req.params.user_id,
      +req.params.cart_item_id
    );
    if (!ok) return next(new ApiError(404, "Cart item not found"));
    return res.json(JSend.success());
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Delete cart item failed"));
  }
}

// DELETE: /carts/:user_id
async function clearCart(req, res, next) {
  try {
    const ok = await cartsService.clearCart(+req.params.user_id);
    if (!ok) return next(new ApiError(404, "Cart not found"));
    return res.json(JSend.success());
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Clear cart failed"));
  }
}

module.exports = {
  getCartItems,
  addItem,
  clearCart,
  removeItem,
  updateItem,
};

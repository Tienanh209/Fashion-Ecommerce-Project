const ordersService = require("../services/orders.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

// GET /orders
async function listOrders(req, res, next) {
  try {
    const result = await ordersService.listOrders(req.query);
    return res.json(JSend.success(result));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "An error occurred while retrieving orders"));
  }
}

// GET /orders/:order_id
async function getOrder(req, res, next) {
  try {
    const order = await ordersService.getOrder(+req.params.order_id);
    if (!order) return next(new ApiError(404, "Order not found"));
    return res.json(JSend.success({ order }));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Error retrieving order"));
  }
}

// POST /orders/:user_id/checkout
async function createOrderFromCart(req, res, next) {
  try {
    const { user_id } = req.params;
    const data = await ordersService.createFromCart(+user_id, req.body);
    return res.status(201).json(JSend.success({ order: data }));
  } catch (e) {
    console.error(e);
    if (/Cart is empty|Address is required/i.test(e?.message))
      return next(new ApiError(400, e.message));
    next(new ApiError(500, "Checkout failed"));
  }
}

// PATCH /orders/:user_id/status
async function updateStatus(req, res, next) {
  try {
    const { order_id } = req.params;
    const { status } = req.body || {};
    const updated = await ordersService.updateStatus(+order_id, status);
    if (!updated) return next(new ApiError(400, "Invalid order or status"));
    return res.json(JSend.success({ order: updated }));
  } catch (e) {
    console.error(e);
    next(new ApiError(500, "Update order status failed"));
  }
}

// DELETE /order/:order_id
async function cancelOrder(req, res, next) {
  try {
    const ok = await ordersService.cancelOrder(+req.params.order_id);
    if (!ok) return next(new ApiError(404, "Order not found"));
    return res.json(JSend.success());
  } catch (e) {
    console.error(e);
    if (/Only pending orders/i.test(e?.message))
      return next(new ApiError(400, e.message));
    next(new ApiError(500, "Cancel order failed"));
  }
}

module.exports = {
  listOrders,
  getOrder,
  createOrderFromCart,
  updateStatus,
  cancelOrder,
};

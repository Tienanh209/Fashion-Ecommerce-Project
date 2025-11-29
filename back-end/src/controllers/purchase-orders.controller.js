const purchaseOrdersService = require("../services/purchase-orders.service");
const ApiError = require("../api-error");
const JSend = require("../jsend");

async function createPurchaseOrder(req, res, next) {
  try {
    const order = await purchaseOrdersService.createPurchaseOrder({
      supplier_id: req.body?.supplier_id,
      note: req.body?.note,
      items: Array.isArray(req.body?.items) ? req.body.items : [],
    });
    return res.status(201).json(JSend.success({ purchase_order: order }));
  } catch (error) {
    console.log(error);
    if (error?.isInventoryImport) {
      return next(new ApiError(400, error.message));
    }
    return next(new ApiError(500, "Failed to create purchase order"));
  }
}

async function listPurchaseOrders(req, res, next) {
  try {
    const orders = await purchaseOrdersService.listPurchaseOrders(req.query);
    return res.json(JSend.success({ purchase_orders: orders }));
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "Failed to load purchase orders"));
  }
}

async function getPurchaseOrder(req, res, next) {
  const { purchase_order_id } = req.params;
  try {
    const order = await purchaseOrdersService.getPurchaseOrder(purchase_order_id);
    if (!order) return next(new ApiError(404, "Purchase order not found"));
    return res.json(JSend.success({ purchase_order: order }));
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        500,
        `Failed to load purchase order with id=${purchase_order_id}`
      )
    );
  }
}

module.exports = {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
};

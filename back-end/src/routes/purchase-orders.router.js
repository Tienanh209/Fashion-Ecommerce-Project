const express = require("express");
const purchaseOrdersController = require("../controllers/purchase-orders.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/purchase-orders", router);

  router.get("/", purchaseOrdersController.listPurchaseOrders);
  router.post("/", purchaseOrdersController.createPurchaseOrder);
  router.all("/", methodNotAllowed);

  router.get("/:purchase_order_id", purchaseOrdersController.getPurchaseOrder);
  router.all("/:purchase_order_id", methodNotAllowed);
};

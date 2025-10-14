const express = require("express");
const ordersController = require("../controllers/orders.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/orders", router);

  /**
   * @swagger
   * tags:
   *   - name: Orders
   *     description: Manage orders & checkout
   */

  /**
   * @swagger
   * /orders:
   *   get:
   *     summary: List orders (admin)
   *     tags: [Orders]
   *     parameters:
   *       - $ref: '#/components/parameters/pageParam'
   *       - $ref: '#/components/parameters/limitParam'
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, paid, shipped, completed, cancelled]
   *       - in: query
   *         name: user_id
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: List orders with pagination
   */
  router.get("/", ordersController.listOrders);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /orders/{order_id}:
   *   get:
   *     summary: Get order detail
   *     tags: [Orders]
   *     parameters: [ { $ref: '#/components/parameters/orderIdParam' } ]
   *     responses:
   *       200:
   *         description: Order detail with items
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     order: { $ref: '#/components/schemas/Order' }
   *                     items:
   *                       type: array
   *                       items: { $ref: '#/components/schemas/OrderItem' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Cancel an order (only pending)
   *     tags: [Orders]
   *     parameters: [ { $ref: '#/components/parameters/orderIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.get("/:order_id", ordersController.getOrder);
  router.delete("/:order_id", ordersController.cancelOrder);
  router.all("/:order_id", methodNotAllowed);

  /**
   * @swagger
   * /orders/{user_id}/checkout:
   *   post:
   *     summary: Create an order from user's cart
   *     tags: [Orders]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/CheckoutInput' }
   *     responses:
   *       201: { description: Created }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   */
  router.post("/:user_id/checkout", ordersController.createOrderFromCart);
  router.all("/:user_id/checkout", methodNotAllowed);

  /**
   * @swagger
   * /orders/{order_id}/status:
   *   patch:
   *     summary: Update order status
   *     tags: [Orders]
   *     parameters: [ { $ref: '#/components/parameters/orderIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/OrderStatusUpdateInput' }
   *     responses:
   *       200: { description: Updated }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.patch("/:order_id/status", ordersController.updateStatus);
  router.all("/:order_id/status", methodNotAllowed);
};

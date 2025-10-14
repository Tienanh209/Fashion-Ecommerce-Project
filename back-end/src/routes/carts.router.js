const express = require("express");
const cartsController = require("../controllers/carts.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/carts", router);

  /**
   * @swagger
   * tags:
   *   - name: Carts
   *     description: Manage shopping carts
   */

  /**
   * @swagger
   * /carts/{user_id}:
   *   get:
   *     summary: Get a user's cart
   *     tags: [Carts]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     responses:
   *       200:
   *         description: User cart with items
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:   { $ref: '#/components/schemas/CartWithItems' }
   *
   *   delete:
   *     summary: Clear cart
   *     tags: [Carts]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   */
  router.get("/:user_id", cartsController.getCartItems);
  router.delete("/:user_id", cartsController.clearCart);
  router.all("/:user_id", methodNotAllowed);

  /**
   * @swagger
   * /carts/{user_id}/items:
   *   post:
   *     summary: Add item to cart
   *     tags: [Carts]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/CartItemInput' }
   *     responses:
   *       201:
   *         description: Updated cart
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:   { $ref: '#/components/schemas/CartWithItems' }
   */
  router.post("/:user_id/items", cartsController.addItem);
  router.all("/:user_id/items", methodNotAllowed);

  /**
   * @swagger
   * /carts/{user_id}/items/{cart_item_id}:
   *   patch:
   *     summary: Update quantity
   *     tags: [Carts]
   *     parameters:
   *       - $ref: '#/components/parameters/userIdParam'
   *       - $ref: '#/components/parameters/cartItemIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [quantity]
   *             properties:
   *               quantity: { type: integer, minimum: 0 }
   *     responses:
   *       200:
   *         description: Updated cart
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:   { $ref: '#/components/schemas/CartWithItems' }
   *
   *   delete:
   *     summary: Remove a cart item
   *     tags: [Carts]
   *     parameters:
   *       - $ref: '#/components/parameters/userIdParam'
   *       - $ref: '#/components/parameters/cartItemIdParam'
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   */
  router.patch("/:user_id/items/:cart_item_id", cartsController.updateItem);
  router.delete("/:user_id/items/:cart_item_id", cartsController.removeItem);
  router.all("/:user_id/items/:cart_item_id", methodNotAllowed);
};

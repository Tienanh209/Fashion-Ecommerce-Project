const express = require("express");
const reviewsController = require("../controllers/reviews.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/reviews", router);

  /**
   * @swagger
   * tags:
   *   - name: Reviews
   *     description: Product reviews & ratings
   */

  /**
   * @swagger
   * /reviews:
   *   get:
   *     summary: List reviews
   *     tags: [Reviews]
   *     parameters:
   *       - $ref: '#/components/parameters/pageParam'
   *       - $ref: '#/components/parameters/limitParam'
   *       - in: query
   *         name: product_id
   *         schema: { type: integer }
   *       - in: query
   *         name: user_id
   *         schema: { type: integer }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [pending, approved, rejected] }
   *       - in: query
   *         name: rating
   *         schema: { type: integer, minimum: 1, maximum: 5 }
   *     responses:
   *       200:
   *         description: List reviews with pagination
   */
  router.get("/", reviewsController.listReviews);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /reviews/{review_id}:
   *   get:
   *     summary: Get review detail
   *     tags: [Reviews]
   *     parameters: [ { $ref: '#/components/parameters/reviewIdParam' } ]
   *     responses:
   *       200: { description: OK }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   patch:
   *     summary: Update own review (title/content/rating)
   *     tags: [Reviews]
   *     parameters: [ { $ref: '#/components/parameters/reviewIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: '#/components/schemas/ReviewInput'
   *     responses:
   *       200: { description: Updated }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Delete review (owner or admin)
   *     tags: [Reviews]
   *     parameters: [ { $ref: '#/components/parameters/reviewIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.get("/:review_id", reviewsController.getReview);
  router.patch("/:review_id", reviewsController.updateReview);
  router.delete("/:review_id", reviewsController.deleteReview);
  router.all("/:review_id", methodNotAllowed);

  /**
   * @swagger
   * /reviews/{user_id}:
   *   post:
   *     summary: Create a review
   *     tags: [Reviews]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ReviewInput' }
   *     responses:
   *       201: { description: Created }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   */
  router.post("/:user_id", reviewsController.addReview);
  router.all("/:user_id", methodNotAllowed);

  /**
   * @swagger
   * /reviews/{review_id}/status:
   *   patch:
   *     summary: Moderate review status (admin)
   *     tags: [Reviews]
   *     parameters: [ { $ref: '#/components/parameters/reviewIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status: { type: string, enum: [pending, approved, rejected] }
   *     responses:
   *       200: { description: Updated }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   */
  router.patch("/:review_id/status", reviewsController.updateStatus);
  router.all("/:review_id/status", methodNotAllowed);

  /**
   * @swagger
   * /reviews/summary/{product_id}:
   *   get:
   *     summary: Aggregate rating summary for product
   *     tags: [Reviews]
   *     parameters: [ { $ref: '#/components/parameters/productIdParam' } ]
   *     responses:
   *       200: { description: OK }
   */
  router.get("/summary/:product_id", reviewsController.productSummary);
  router.all("/summary/:product_id", methodNotAllowed);
};

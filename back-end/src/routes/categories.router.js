const express = require("express");
const categoriesController = require("../controllers/categories.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/categories", router);

  /**
   * @swagger
   * tags:
   *   - name: Categories
   *     description: CRUD categories for admin dashboard
   */

  /**
   * @swagger
   * /categories:
   *   get:
   *     summary: Get all categories
   *     tags: [Categories]
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     categories:
   *                       type: array
   *                       items: { $ref: '#/components/schemas/Category' }
   *
   *   post:
   *     summary: Create a category
   *     tags: [Categories]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string, example: Shirts }
   *     responses:
   *       201:
   *         description: Category created
   */
  router.get("/", categoriesController.getCategories);
  router.post("/", categoriesController.addCategory);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /categories/{category_id}:
   *   put:
   *     summary: Update a category
   *     tags: [Categories]
   *     parameters: [ { $ref: '#/components/parameters/categoryIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string, example: T-shirts }
   *     responses:
   *       200:
   *         description: Category updated
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Delete a category
   *     tags: [Categories]
   *     parameters: [ { $ref: '#/components/parameters/categoryIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.put("/:category_id", categoriesController.updateCategory);
  router.delete("/:category_id", categoriesController.deleteCategory);
  router.all("/:category_id", methodNotAllowed);
};

const express = require("express");
const brandsController = require("../controllers/brands.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/brands", router);

  /**
   * @swagger
   * tags:
   *   - name: Brands
   *     description: Manage brands
   */

  /**
   * @swagger
   * /brands:
   *   get:
   *     summary: List brands
   *     tags: [Brands]
   *     responses:
   *       200: { description: OK }
   *   post:
   *     summary: Create brand
   *     tags: [Brands]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *     responses:
   *       201: { description: Created }
   */
  router.get("/", brandsController.listBrands);
  router.post("/", brandsController.createBrand);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /brands/{brand_id}:
   *   get:
   *     summary: Get brand by id
   *     tags: [Brands]
   *     parameters: [ { name: brand_id, in: path, required: true, schema: { type: integer } } ]
   *     responses:
   *       200: { description: OK }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   put:
   *     summary: Update brand
   *     tags: [Brands]
   *     parameters: [ { name: brand_id, in: path, required: true, schema: { type: integer } } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *     responses:
   *       200: { description: Updated }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Delete brand
   *     tags: [Brands]
   *     parameters: [ { name: brand_id, in: path, required: true, schema: { type: integer } } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.get("/:brand_id", brandsController.getBrand);
  router.put("/:brand_id", brandsController.updateBrand);
  router.delete("/:brand_id", brandsController.deleteBrand);
  router.all("/:brand_id", methodNotAllowed);
};

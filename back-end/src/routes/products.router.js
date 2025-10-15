const express = require("express");
const productsController = require("../controllers/products.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");
const thumbnailUpload = require("../middlewares/thumbnail-upload.middleware");
const router = express.Router();

module.exports.setup = (app) => {
  app.use("/products", router);

  /**
   * @swagger
   * tags:
   *   - name: Products
   *     description: Products listing & detail
   */

  /**
   * @swagger
   * /products:
   *   get:
   *     summary: Get products (list)
   *     tags: [Products]
   *     parameters:
   *       - $ref: '#/components/parameters/pageParam'
   *       - $ref: '#/components/parameters/limitParam'
   *       - in: query
   *         name: title
   *         schema: { type: string }
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *           enum: [T-shirts, Shirts, Jeans, Shorts, Jackets]
   *       - in: query
   *         name: gender
   *         schema:
   *           type: string
   *           enum: [male, female, unisex]
   *       - in: query
   *         name: brand_id
   *         schema: { type: integer }
   *       - in: query
   *         name: brand
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List products with pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     metadata: { $ref: '#/components/schemas/PaginationMetadata' }
   *                     products:
   *                       type: array
   *                       items: { $ref: '#/components/schemas/Product' }
   *
   *   post:
   *     summary: Create product
   *     tags: [Products]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/ProductInput'
   *     responses:
   *       201:
   *         description: A new product
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     product: { $ref: '#/components/schemas/Product' }
   */
  router.get("/", productsController.getProductsByFilter);
  router.post("/", thumbnailUpload, productsController.addProduct);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /products/{product_id}:
   *   get:
   *     summary: Get product detail (with variants & galleries)
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/productIdParam' } ]
   *     responses:
   *       200:
   *         description: Product detail
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     product: { $ref: '#/components/schemas/Product' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   put:
   *     summary: Update product by ID
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/productIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/ProductInput'
   *     responses:
   *       200: { description: Product updated }
   *       400: { $ref: '#/components/responses/400BadRequest' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Delete product by ID
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/productIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.get("/:product_id", productsController.getProduct);
  router.put("/:product_id", thumbnailUpload, productsController.updateProduct);
  router.delete("/:product_id", productsController.deleteProduct);
  router.all("/:product_id", methodNotAllowed);

  /**
   * @swagger
   * /products/{product_id}/variants:
   *   post:
   *     summary: Create a variant for product
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/productIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/ProductVariant' }
   *     responses:
   *       201: { description: A new variant }
   */
  router.post("/:product_id/variants", productsController.addVariant);
  router.all("/:product_id/variants", methodNotAllowed);

  /**
   * @swagger
   * /products/variants/{variant_id}:
   *   delete:
   *     summary: Delete product's variant by ID
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/variantIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.delete("/variants/:variant_id", productsController.deleteVariant);
  router.all("/variants/:variant_id", methodNotAllowed);

  /**
   * @swagger
   * /products/{product_id}/galleries:
   *   post:
   *     summary: Add a new gallery
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/productIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema: { $ref: '#/components/schemas/Gallery' }
   *     responses:
   *       201: { description: A new gallery }
   */
  router.post(
    "/:product_id/galleries",
    thumbnailUpload,
    productsController.addGallery
  );
  router.all("/:product_id/galleries", methodNotAllowed);

  /**
   * @swagger
   * /products/galleries/{gallery_id}:
   *   delete:
   *     summary: Delete product's gallery by ID
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/galleryIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.delete("/galleries/:gallery_id", productsController.deleteGallery);
  router.all("/galleries/:gallery_id", methodNotAllowed);
};

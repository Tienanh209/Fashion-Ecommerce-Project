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

  // /products
  router.get("/", productsController.getProductsByFilter);
  router.post("/", thumbnailUpload, productsController.addProduct);
  router.all("/", methodNotAllowed);

  // /products/:product_id
  router.get("/:product_id", productsController.getProduct);
  router.put("/:product_id", thumbnailUpload, productsController.updateProduct);
  router.delete("/:product_id", productsController.deleteProduct);
  router.all("/:product_id", methodNotAllowed);

  // /products/:product_id/variants
  router.post("/:product_id/variants", productsController.addVariant);
  router.all("/:product_id/variants", methodNotAllowed);

  /**
   * @swagger
   * /products/variants/{variant_id}:
   *   get:
   *     summary: Get a product variant (with product title & thumbnail)
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/variantIdParam' } ]
   *     responses:
   *       200:
   *         description: Variant detail
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     variant_id: { type: integer }
   *                     product_id: { type: integer }
   *                     size: { type: string }
   *                     color: { type: string }
   *                     sku: { type: string }
   *                     price: { type: number }
   *                     stock: { type: integer }
   *                     product_title: { type: string }
   *                     product_thumbnail: { type: string }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Delete product's variant by ID
   *     tags: [Products]
   *     parameters: [ { $ref: '#/components/parameters/variantIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.get(
    "/variants/:variant_id/details",
    productsController.getProductsByVariantId
  );

  router.get("/variants/:variant_id", productsController.getVariant); // <— NEW
  router.patch("/variants/:variant_id", productsController.updateVariant);
  router.delete("/variants/:variant_id", productsController.deleteVariant);
  router.all("/variants/:variant_id", methodNotAllowed);

  // /products/:product_id/galleries
  router.post(
    "/:product_id/galleries",
    thumbnailUpload,
    productsController.addGallery
  );
  router.all("/:product_id/galleries", methodNotAllowed);

  // /products/galleries/:gallery_id
  router.delete("/galleries/:gallery_id", productsController.deleteGallery);
  router.all("/galleries/:gallery_id", methodNotAllowed);
};

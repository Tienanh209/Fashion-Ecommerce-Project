const express = require("express");
const productsController = require("../controllers/products.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/products", router);
  /**
   * @swagger
   * /products:
   *  get:
   *      summary: Get products by filter
   *      description: Get products by filter
   *      parameters:
   *        - in: query
   *          name: category
   *          schema:
   *            type: string
   *            enum: [Shirt, Pants, Shoes]
   *            description: Category of product
   *        - in: query
   *          name: color
   *          schema:
   *            type: string
   *            enum: [red, blue, green, yellow, gray, black]
   *            description: Color of product
   *        - in: query
   *          name: size
   *          schema:
   *            type: string
   *            enum: [S, M, L, XL, XXL]
   *            description: Size of product
   *      tags:
   *        - Products
   *      responses:
   *        200:
   *          description: A list of products
   *          content:
   *            application/json:
   *              scheme:
   *                type: Object
   *                properties:
   *                  status:
   *                    type: string
   *                    description: status of the product
   *                    enum: [success]
   *                  data:
   *                    type: Object
   *                    properties:
   *                      product:
   *                        type: array
   *                        $ref: '#/components/schemas/Product'
   */
  router.get("/", productsController.getProductsByFilter);
  /**
   * @swagger
   * /products:
   *  post:
   *      summary:   Create a new product
   *      description:  Create a new product
   *      requestBody:
   *        required: true
   *        content:
   *          multipart/form-data:
   *            schema:
   *              $ref:  '#/components/schemas/Product'
   *      tags:
   *        - Products
   *      responses:
   *        201:
   *          description: A new product
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  status:
   *                    type: string
   *                    description: The response status
   *                    enum: [success]
   *                  data:
   *                    type: object
   *                    properties:
   *                      product:
   *                        $ref: '#/components/schemas/Product'
   */
  router.post("/", productsController.addProduct);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /products/{product_id}:
   *   get:
   *    summary:    Get a product by id
   *    description:  Get a product by id
   *    parameters:
   *        - $ref: '#/components/parameters/productIdParam'
   *    tags:
   *        - Products
   *    responses:
   *      200:
   *        description: A product
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                status:
   *                  type: string
   *                  description:  The response status
   *                  enum: [success]
   *                data:
   *                  type: object
   *                  properties:
   *                    product:
   *                      $ref: '#/components/schemas/Product'
   */
  router.get("/:id", productsController.getProduct);
  /**
   * @swagger
   *  /products/{product_id}:
   *   put:
   *     summary: Update product by ID
   *     description: Update product by ID
   *     parameters:
   *       - $ref: '#/components/parameters/productIdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/Product'
   *     tags:
   *       - Products
   *     responses:
   *       200:
   *         description: An updated product
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   description: The response status
   *                   enum: [success]
   *                 data:
   *                   type: object
   *                   properties:
   *                     product:
   *                       $ref: '#/components/schemas/Product'
   */
  router.put("/:id", productsController.updateProduct);
  /**
   * @swagger
   *  /products/{product_id}:
   *   delete:
   *     summary: Delete product by ID
   *     description: Delete product by ID
   *     parameters:
   *       - $ref: '#/components/parameters/productIdParam'
   *     tags:
   *       - Products
   *     responses:
   *       200:
   *         description: Product deleted
   *         $ref: '#/components/responses/200NoData'
   */
  router.delete("/:id", productsController.deleteProduct);
  router.all("/:id", methodNotAllowed);
};

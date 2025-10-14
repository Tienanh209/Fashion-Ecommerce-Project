const express = require("express");
const usersController = require("../controllers/users.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");
const avatarUpload = require("../middlewares/avatar-upload.middleware");
const multer = require("multer");
const parseForm = multer().none();

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/users", router);

  /**
   * @swagger
   * tags:
   *   - name: Users
   *     description: Manage users
   *   - name: Auth
   *     description: Authenticate user
   */

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: List users
   *     tags: [Users]
   *     parameters:
   *       - $ref: '#/components/parameters/limitParam'
   *       - $ref: '#/components/parameters/pageParam'
   *       - in: query
   *         name: name
   *         schema: { type: string }
   *       - in: query
   *         name: email
   *         schema: { type: string }
   *       - in: query
   *         name: phone
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List users with pagination
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
   *                     users:
   *                       type: array
   *                       items: { $ref: '#/components/schemas/User' }
   */
  router.get("/", usersController.listUsers);
  router.all("/", methodNotAllowed);

  /**
   * @swagger
   * /users/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/UserRegisterInput'
   *     responses:
   *       201:
   *         description: A new user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     user: { $ref: '#/components/schemas/User' }
   */
  router.post("/register", avatarUpload, usersController.register);
  router.all("/register", methodNotAllowed);

  /**
   * @swagger
   * /users/login:
   *   post:
   *     summary: Login
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             $ref: '#/components/schemas/UserLoginInputMultipart'
   *     responses:
   *       200:
   *         description: Login success
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:  { $ref: '#/components/schemas/User' }
   *                     token: { type: string }
   *       401: { $ref: '#/components/responses/401Unauthorized' }
   */
  router.post("/login", parseForm, usersController.login);
  router.all("/login", methodNotAllowed);

  /**
   * @swagger
   * /users/{user_id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     responses:
   *       200:
   *         description: User
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     user: { $ref: '#/components/schemas/User' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   patch:
   *     summary: Update user (partial)
   *     tags: [Users]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               fullname:     { type: string }
   *               email:        { type: string, format: email }
   *               phone_number: { type: string }
   *               address:      { type: string }
   *               password:     { type: string, format: password }
   *               role_id:      { type: integer }
   *               avatarFile:   { type: string, format: binary }
   *     responses:
   *       200:
   *         description: Updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, enum: [success] }
   *                 data:
   *                   type: object
   *                   properties:
   *                     user: { $ref: '#/components/schemas/User' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   *
   *   delete:
   *     summary: Delete user
   *     tags: [Users]
   *     parameters: [ { $ref: '#/components/parameters/userIdParam' } ]
   *     responses:
   *       200: { $ref: '#/components/responses/200NoData' }
   *       404: { $ref: '#/components/responses/404NotFound' }
   */
  router.get("/:user_id", usersController.getUser);
  router.patch("/:user_id", avatarUpload, usersController.updateUser);
  router.delete("/:user_id", usersController.deleteUser);
  router.all("/:user_id", methodNotAllowed);
};

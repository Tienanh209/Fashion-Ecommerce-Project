const express = require("express");
const favoritesController = require("../controllers/favorites.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/favorites", router);

  /**
   * @swagger
   * tags:
   *   - name: Favorites
   *     description: User favorite products
   */

  router.get("/:user_id", favoritesController.listFavorites);
  router.post("/:user_id", favoritesController.addFavorite);
  router.all("/:user_id", methodNotAllowed);

  router.delete("/:user_id/:product_id", favoritesController.removeFavorite);
  router.all("/:user_id/:product_id", methodNotAllowed);
};

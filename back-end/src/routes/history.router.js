const express = require("express");
const historyController = require("../controllers/history.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router({ mergeParams: true });

function setup(app) {
  app.use("/users/:user_id/history", router);

  router.get("/", historyController.getUserHistory);
  router.post("/", historyController.storeHistory);
  router.all("/", methodNotAllowed);
}

module.exports = { setup };

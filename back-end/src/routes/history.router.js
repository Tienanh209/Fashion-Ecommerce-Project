const express = require("express");
const historyController = require("../controllers/history.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router({ mergeParams: true });

function setup(app) {
  app.use("/users/:user_id/history", router);

  router.get("/", historyController.getUserHistory);
  router.post("/", historyController.storeHistory);
  router.delete("/:history_id", historyController.deleteHistory);
  router.all("/", methodNotAllowed);
  router.all("/:history_id", methodNotAllowed);
}

module.exports = { setup };

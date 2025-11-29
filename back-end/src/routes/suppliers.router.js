const express = require("express");
const suppliersController = require("../controllers/suppliers.controller");
const { methodNotAllowed } = require("../controllers/errors.controller");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/suppliers", router);

  router.get("/", suppliersController.listSuppliers);
  router.post("/", suppliersController.createSupplier);
  router.all("/", methodNotAllowed);
};

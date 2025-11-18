const express = require("express");
const { methodNotAllowed } = require("../controllers/errors.controller");
const salesController = require("../controllers/sales.controller");
const bannerUpload = require("../middlewares/banner-upload.middleware");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/sales", router);

  router.get("/", salesController.listSales);
  router.post("/", bannerUpload, salesController.createSale);
  router.all("/", methodNotAllowed);

  router.get("/:sale_id", salesController.getSale);
  router.patch("/:sale_id", bannerUpload, salesController.updateSale);
  router.delete("/:sale_id", salesController.deleteSale);
  router.all("/:sale_id", methodNotAllowed);
};

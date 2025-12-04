const express = require("express");
const { methodNotAllowed } = require("../controllers/errors.controller");
const virtualTryonController = require("../controllers/virtual-tryon.controller");
const tryonUpload = require("../middlewares/tryon-upload.middleware");

const router = express.Router();

module.exports.setup = (app) => {
  app.use("/virtual-tryon", router);

  router.post("/", tryonUpload, virtualTryonController.generateVirtualTryOn);
  router.post("/video", virtualTryonController.generateVirtualTryOnVideo);
  router.all("/", methodNotAllowed);
  router.all("/video", methodNotAllowed);
};

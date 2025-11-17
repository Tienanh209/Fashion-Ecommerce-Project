const multer = require("multer");
const ApiError = require("../api-error");

const storage = multer.memoryStorage();
const allowedMime = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

function inventoryUpload(req, res, next) {
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (request, file, cb) => {
      const isExcel =
        allowedMime.has(file.mimetype) || /\.xlsx?$/i.test(file.originalname);
      if (!isExcel) {
        return cb(
          new ApiError(
            400,
            "Only Excel files (.xlsx or .xls) can be used for inventory imports."
          )
        );
      }
      cb(null, true);
    },
  }).single("inventoryFile");

  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, err.message));
    }
    return next(
      new ApiError(400, "Unable to process the uploaded inventory file.")
    );
  });
}

module.exports = inventoryUpload;

const multer = require("multer");
const ApiError = require("../api-error");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 2,
  },
});

function tryonUpload(req, res, next) {
  const handler = upload.fields([
    { name: "garmentImage", maxCount: 1 },
    { name: "modelImage", maxCount: 1 },
  ]);

  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(
        new ApiError(
          400,
          err.code === "LIMIT_FILE_SIZE"
            ? "Uploaded files must be 5MB or smaller"
            : "An error occurred while uploading images"
        )
      );
    }

    if (err) {
      return next(
        new ApiError(500, "An unknown error occurred while uploading images")
      );
    }

    return next();
  });
}

module.exports = tryonUpload;

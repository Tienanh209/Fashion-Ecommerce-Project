const multer = require("multer");
const path = require("path");
const ApiError = require("../api-error");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + path.extname(file.originalname));
  },
});

function bannerUpload(req, res, next) {
  const upload = multer({ storage }).single("bannerFile");

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, "An error occurred while uploading the banner"));
    } else if (err) {
      return next(new ApiError(500, "An unknown error occurred while uploading the banner"));
    }
    next();
  });
}

module.exports = bannerUpload;

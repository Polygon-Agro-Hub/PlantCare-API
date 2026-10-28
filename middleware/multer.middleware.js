const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|heic|heif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype =
      filetypes.test(file.mimetype) ||
      file.mimetype === "image/heic" ||
      file.mimetype === "image/heif" ||
      file.mimetype === "application/octet-stream";

    if (extname || mimetype) {
      return cb(null, true);
    } else {
      const err = new Error("Only HEIC, JPG, and PNG files are allowed.");
      err.status = 400;
      return cb(err);
    }
  },
});

module.exports = upload;

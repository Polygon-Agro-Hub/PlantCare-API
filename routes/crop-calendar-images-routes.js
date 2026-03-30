const express = require("express");
const {
  uploadImage,
  upload,
  getRequiredImagesEndpoint,
} = require("../end-point/crop-calendar-images-ep");
const authenticate = require("../middleware/auth.middleware");
const router = express.Router();

router.post(
    "/calendar-tasks/upload-image",
    authenticate,
    upload.single("image"),
    uploadImage,
);

router.get(
    "/calendar-tasks/requiredimages/:cropId", 
    getRequiredImagesEndpoint
);

module.exports = router;

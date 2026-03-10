const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const router = express.Router();
const userCrop = require("../end-point/crop-ep");

router.get(
  "/get-all-crop/:categorie", 
  userCrop.getCropByCategory
);

router.get(
  "/get-all-crop-bydistrict/:categorie/:district",
  userCrop.getCropByDistrict,
),

router.get(
  "/crop-feed/:cropid", 
  authenticate, 
  userCrop.CropCalanderFeed
);

router.get(
  "/get-crop-variety/:id", 
  userCrop.getCropVariety
);

router.get(
  "/get-crop-calender-details/:id/:naofcul/:method",
  userCrop.getCropCalenderDetails,
);

router.post(
  "/enroll-crop", 
  authenticate, 
  userCrop.enroll
);

router.get(
  "/get-user-ongoing-cul", 
  authenticate, 
  userCrop.OngoingCultivaionGetById
);

router.get(
  "/get-user-ongoingculscrops/:id",
  userCrop.getOngoingCultivationCropByid,
);

router.post(
  "/update-ongoingcultivation",
  authenticate,
  userCrop.UpdateOngoingCultivationScrops,
);

router.get(
  "/slave-crop-calendar/:cropCalendarId/:farmId",
  authenticate,
  userCrop.getSlaveCropCalendarDaysByUserAndCrop,
);

router.get(
  "/slave-crop-calendar-progress/:cropCalendarId/:farmId",
  authenticate,
  userCrop.getSlaveCropCalendarPrgress,
);

router.get(
  "/get-uploaded-images-count/:cropId",
  authenticate,
  userCrop.getUploadedImagesCount,
);

router.post(
  "/update-slave", 
  authenticate, 
  userCrop.updateCropCalendarStatus
);

router.post(
  "/geo-location", 
  userCrop.addGeoLocation
);

router.get(
  "/get-task-image/:slaveId", 
  authenticate, 
  userCrop.getTaskImage
);

module.exports = router;

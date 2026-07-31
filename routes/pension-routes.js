const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const pensionRequestController = require("../end-point/pension-ep");
const upload = require("../middleware/multer.middleware");

// Check Pension Request Status
router.get(
  "/pension-request/check-status",
  authenticate,
  pensionRequestController.checkPensionRequestStatus,
);

// Submit Pension Request
router.post(
  "/pension-request/submit",
  authenticate,
  upload.fields([
    { name: "nicFront", maxCount: 1 },
    { name: "nicBack", maxCount: 1 },
    { name: "sucNicFront", maxCount: 1 },
    { name: "sucNicBack", maxCount: 1 },
    { name: "birthCrtFront", maxCount: 1 },
    { name: "birthCrtBack", maxCount: 1 },
  ]),
  pensionRequestController.submitPensionRequest,
);

router.put(
  "/pension-request/update-first-time",
  authenticate,
  pensionRequestController.updateFirstTimeStatus,
);

router.get(
  "/check-eligibility",
  authenticate,
  pensionRequestController.checkEligibility,
);

module.exports = router;

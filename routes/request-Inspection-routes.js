const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const requestInspectionEp = require("../end-point/request-Inspection-ep");

router.get(
    "/get-officerservices",
    authenticate,
    requestInspectionEp.getOfficerservices,
);

router.get(
    "/get-farms", 
    authenticate, 
    requestInspectionEp.getFarms
);

router.get(
    "/get-farm-crops/:farmId",
    authenticate,
    requestInspectionEp.getFramCrop,
);

router.post(
    "/submit-request",
    authenticate,
    requestInspectionEp.submitRequestInspection,
);

router.get(
    "/get-request", 
    authenticate, 
    requestInspectionEp.getRequest
);

module.exports = router;

const express = require("express");
const goviCapitalEp = require("../end-point/govi-capital-ep");
const authenticate = require("../middleware/auth.middleware");
const router = express.Router();

router.get(
    "/get-farm-crops", 
    authenticate, 
    goviCapitalEp.getCrops
);

router.get(
    "/get-farmer-details", 
    authenticate, 
    goviCapitalEp.getFarmerDetails
);

router.get(
    "/get-investment-requests",
    authenticate,
    goviCapitalEp.getInvestmentRequests,
);

router.post(
    "/create-investment-request",
    authenticate,
    goviCapitalEp.uploadMultiple.fields([
        { name: "nicFront", maxCount: 1 },
        { name: "nicBack", maxCount: 1 },
    ]),
    goviCapitalEp.createInvestmentRequest,
);

router.get(
    "/get-approvedStatus-details/:id",
    authenticate,
    goviCapitalEp.getApprovedStatusDetails,
);

router.post(
    "/update-review-status/:id",
    authenticate,
    goviCapitalEp.updateReviewStatus,
);

module.exports = router;

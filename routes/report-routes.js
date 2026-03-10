const express = require("express");
const router = express.Router();
const transactionEp = require("../end-point/report-ep");
const authenticate = require("../middleware/auth.middleware");

router.get(
    "/history", 
    authenticate, 
    transactionEp.getTransactionHistory
);

router.get(
    "/user-details/:userId/:centerId/:companyId",
    authenticate,
    transactionEp.getUserWithBankDetails,
);

router.get(
    "/farmer-report/:userId/:createdAt/:farmerId",
    authenticate,
    transactionEp.GetFarmerReportDetails,
);

module.exports = router;

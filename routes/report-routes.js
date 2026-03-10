const express = require("express");
const router = express.Router();
const transactionEp = require("../end-point/report-ep");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/history", authMiddleware, transactionEp.getTransactionHistory);

router.get(
    "/user-details/:userId/:centerId/:companyId",
    authMiddleware,
    transactionEp.getUserWithBankDetails,
);

router.get(
    "/farmer-report/:userId/:createdAt/:farmerId",
    authMiddleware,
    transactionEp.GetFarmerReportDetails,
);

module.exports = router;

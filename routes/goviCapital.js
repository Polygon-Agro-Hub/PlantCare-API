const express = require('express');
const goviCapitalEp = require('../end-point/goviCapital-ep');
const auth = require("../Middlewares/auth.middleware");

const router = express.Router();

router.get('/get-farm-crops', auth, goviCapitalEp.getCrops);

router.get('/get-farmer-details', auth, goviCapitalEp.getFarmerDetails);

router.get('/get-investment-requests', auth, goviCapitalEp.getInvestmentRequests);

router.post(
    '/create-investment-request',
    auth,
    goviCapitalEp.uploadMultiple.fields([
        { name: 'nicFront', maxCount: 1 },
        { name: 'nicBack', maxCount: 1 }
    ]),
    goviCapitalEp.createInvestmentRequest
);

router.get('/get-approvedStatus-details/:id', auth, goviCapitalEp.getApprovedStatusDetails);

router.post('/update-review-status/:id', auth, goviCapitalEp.updateReviewStatus);

module.exports = router;
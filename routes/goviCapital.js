const express = require('express');
const goviCapitalEp = require('../end-point/goviCapital-ep');
const auth = require("../Middlewares/auth.middleware");

const router = express.Router();

router.get('/get-farm-crops', auth, goviCapitalEp.getCrops);

router.get('/get-farmer-details', auth, goviCapitalEp.getFarmerDetails);

router.post(
    '/create-investment-request',
    auth,
    goviCapitalEp.uploadMultiple.fields([
        { name: 'nicFront', maxCount: 1 },
        { name: 'nicBack', maxCount: 1 }
    ]),
    goviCapitalEp.createInvestmentRequest
);

module.exports = router;
const express = require('express');
const router = express.Router();
const auth = require('../Middlewares/auth.middleware');
const requestInspectionEp = require("../end-point/requestInspection-ep");

router.get('/get-officerservices', auth, requestInspectionEp.getOfficerservices);

router.get('/get-farms', auth, requestInspectionEp.getFarms);

router.get('/get-farm-crops/:farmId', auth, requestInspectionEp.getFramCrop);

router.post('/submit-request', auth, requestInspectionEp.submitRequestInspection);


module.exports = router;
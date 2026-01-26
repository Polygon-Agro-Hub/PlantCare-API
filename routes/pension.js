const express = require('express');
const router = express.Router();
const auth = require('../Middlewares/auth.middleware');
const pensionRequestController = require('../end-point/pension-ep');
const upload = require('../Middlewares/multer.middleware');


router.get('/pension-request/check-status', auth, pensionRequestController.checkPensionRequestStatus);
router.post(
    '/pension-request/submit', 
    auth, 
    upload.fields([
        { name: 'nicFront', maxCount: 1 },
        { name: 'nicBack', maxCount: 1 },
        { name: 'sucNicFront', maxCount: 1 },
        { name: 'sucNicBack', maxCount: 1 }
    ]),
    pensionRequestController.submitPensionRequest
);


module.exports = router;
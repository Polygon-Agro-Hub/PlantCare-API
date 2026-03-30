const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const cropEp = require('../end-point/user-crop-ep');

router.post(
    '/crops-add', 
    authenticate, 
    cropEp.createCrop
);

router.get(
    '/crops-view', 
    authenticate, 
    cropEp.viewCrops
);

router.delete(
    '/crops-delete/:cropId', 
    authenticate, 
    cropEp.deleteCrop
);

module.exports = router;

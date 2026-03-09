const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const cropEp = require('../end-point/userCrop-ep');

router.post('/crops-add', authenticateToken, cropEp.createCrop);

router.get('/crops-view', authenticateToken, cropEp.viewCrops);

router.delete('/crops-delete/:cropId', authenticateToken, cropEp.deleteCrop);

module.exports = router;

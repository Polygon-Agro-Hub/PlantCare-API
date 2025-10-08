const express = require('express');
const { addFixedAsset, deleteFixedAsset, getFixedAssetDetailsById, getFixedAssetsByCategory, updateFixedAsset } = require('../Controllers/fixedAsset.controller');
const authMiddleware = require('../Middlewares/auth.middleware');

const router = express.Router();

router.post('/fixedassets', authMiddleware, addFixedAsset);

router.get('/fixed-assets/:category', authMiddleware, getFixedAssetsByCategory);

router.get('/fixedasset/:assetId/:category', authMiddleware, getFixedAssetDetailsById);

router.put('/fixedasset/:assetId/:category', authMiddleware, updateFixedAsset);

router.delete('/fixedasset/:assetId/:category', authMiddleware, deleteFixedAsset);




module.exports = router;
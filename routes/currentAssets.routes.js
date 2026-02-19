const express = require("express");
const router = express.Router();
const currentAssetController = require("../Controllers/currentAssets.controller");
const authMiddleware = require("../Middlewares/auth.middleware");
const currentAssetsEp = require("../end-point/currentAsset-ep");

router.post('/currentAsset', authMiddleware, currentAssetController.handleAddFixedAsset);

router.get("/assets", authMiddleware, currentAssetsEp.getAssetsByCategory);

router.get(
    "/currentAsset",
    authMiddleware,
    currentAssetsEp.getAllCurrentAssets
);

router.delete('/removeAsset/:category/:assetId', authMiddleware, currentAssetController.deleteAsset);

router.get(
    "/get-currentasset-alreadyHave-byuser",
    authMiddleware,
    currentAssetsEp.getCurrectAssetAlredayHaveByUser
);

module.exports = router;
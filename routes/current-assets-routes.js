const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const currentAssetsEp = require("../end-point/current-assets-ep");

router.post(
    "/currentAsset",
    authenticate,
    currentAssetsEp.handleAddCurrectAsset,
);

router.get(
    "/assets", 
    authenticate, 
    currentAssetsEp.getAssetsByCategory
);

router.get(
    "/currentAsset",
    authenticate,
    currentAssetsEp.getAllCurrentAssets,
);

router.delete(
    "/removeAsset/:category/:assetId",
    authenticate,
    currentAssetsEp.deleteAsset,
);

router.get(
    "/get-currentasset-alreadyHave-byuser",
    authenticate,
    currentAssetsEp.getCurrectAssetAlredayHaveByUser,
);

module.exports = router;

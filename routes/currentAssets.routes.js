const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const currentAssetsEp = require("../end-point/currentAsset-ep");

router.post(
  "/currentAsset",
  authMiddleware,
  currentAssetsEp.handleAddCurrectAsset,
);

router.get(
    "/assets", 
    authMiddleware, 
    currentAssetsEp.getAssetsByCategory
);

router.get(
  "/currentAsset",
  authMiddleware,
  currentAssetsEp.getAllCurrentAssets,
);

router.delete(
  "/removeAsset/:category/:assetId",
  authMiddleware,
  currentAssetsEp.deleteAsset,
);

router.get(
  "/get-currentasset-alreadyHave-byuser",
  authMiddleware,
  currentAssetsEp.getCurrectAssetAlredayHaveByUser,
);

module.exports = router;

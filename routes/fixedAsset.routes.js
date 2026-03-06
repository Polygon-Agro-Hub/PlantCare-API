const express = require("express");
const router = express.Router();
const authMiddleware = require("../Middlewares/auth.middleware");
const fixedAssetEp = require("../end-point/fixedAsset-ep");

router.post("/fixedassets", authMiddleware, fixedAssetEp.addFixedAsset);
router.get("/fixed-assets/:category", authMiddleware, fixedAssetEp.getFixedAssetsByCategory);
router.get("/fixedasset/:assetId/:category", authMiddleware, fixedAssetEp.getFixedAssetDetailsById);
router.put("/fixedasset/:assetId/:category", authMiddleware, fixedAssetEp.updateFixedAsset);
router.delete("/fixedasset/:assetId/:category", authMiddleware, fixedAssetEp.deleteFixedAsset);

module.exports = router;
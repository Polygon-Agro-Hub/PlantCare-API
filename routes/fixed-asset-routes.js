const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const fixedAssetEp = require("../end-point/fixed-assets-ep");

router.post(
    "/fixedassets", 
    authenticate, 
    fixedAssetEp.addFixedAsset
);

router.get(
    "/fixed-assets/:category",
    authenticate,
    fixedAssetEp.getFixedAssetsByCategory,
);

router.get(
    "/fixedasset/:assetId/:category",
    authenticate,
    fixedAssetEp.getFixedAssetDetailsById,
);

router.put(
    "/fixedasset/:assetId/:category",
    authenticate,
    fixedAssetEp.updateFixedAsset,
);

router.delete(
    "/fixedasset/:assetId/:category",
    authenticate,
    fixedAssetEp.deleteFixedAsset,
);

module.exports = router;

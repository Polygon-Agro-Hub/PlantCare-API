const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const farmEp = require("../end-point/farm-ep");

router.post(
  "/add-farm", 
  authenticate, 
  farmEp.CreateFarm
);

router.get(
  "/get-farms", 
  authenticate, 
  farmEp.getFarms
);

router.get(
  "/get-membership", 
  authenticate, 
  farmEp.getMemberShip
);

router.get(
  "/get-farms/byFarm-Id/:id", 
  authenticate, 
  farmEp.getFarmById
);

router.post(
  "/add-payment", 
  authenticate, 
  farmEp.CreatePayment
);

router.get(
  "/get-user-ongoing-cul/:farmId",
  authenticate,
  farmEp.OngoingCultivaionGetById,
);

router.post(
  "/enroll-crop/:farmId", 
  authenticate, 
  farmEp.enroll
);

router.post(
  "/members-phoneNumber-checker", 
  farmEp.phoneNumberChecker
);

router.post(
  "/members-nic-checker", 
  farmEp.nicChecker
);

router.post(
  "/members-nic-checker", 
  farmEp.nicChecker
);

router.put(
  "/update-farm", 
  authenticate, 
  farmEp.UpdateFarm
);

router.post(
  "/create-new-staffmember/:farmId",
  authenticate,
  farmEp.CreateNewStaffMember,
);

router.get(
  "/get-staffMmber-byId/:staffMemberId",
  authenticate,
  farmEp.getStaffMember,
);

router.put(
  "/update-staffmember/:staffMemberId",
  authenticate,
  farmEp.updateStaffMember,
);

router.delete(
  "/delete-staffmember/:staffMemberId/:farmId",
  authenticate,
  farmEp.deleteStaffMember,
);

router.get(
  "/get-renew", 
  authenticate, 
  farmEp.getrenew
);

router.delete(
  "/delete-farm/:farmId", 
  authenticate, 
  farmEp.deleteFarm
);

router.get(
  "/select-farm", 
  authenticate, 
  farmEp.getSelectFarm);

router.post(
  "/currentAsset/:farmId", 
  authenticate, 
  farmEp.handleAddFixedAsset
);

// Update currect asset
router.put(
  "/currentAsset/update/:assetId",
  authenticate,
  farmEp.updateCurrentAsset,
);

router.get(
  "/assets/:farmId", 
  authenticate, 
  farmEp.getAssetsByCategory
);

router.get(
  "/currentAsset/:farmId", 
  authenticate, 
  farmEp.getAllCurrentAssets
);

router.delete(
  "/removeAsset/:category/:assetId",
  authenticate,
  farmEp.deleteAsset,
);

router.get(
  "/fixed-assets/:category/:farmId",
  authenticate,
  farmEp.getFixedAssetsByCategory,
);

router.get(
  "/get-farmName/:farmId", 
  authenticate, 
  farmEp.getFarmName
);

router.get(
  "/get-farm-extend/:farmId", 
  authenticate, 
  farmEp.getFarmExtend
);

// Get alreday add currect asset
router.get(
  "/get-currectasset-alreadyHave/:farmId",
  authenticate,
  farmEp.getCurrectAssetAlredayHave,
);

module.exports = router;

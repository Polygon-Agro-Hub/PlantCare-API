const express = require('express');
const router = express.Router();
const auth = require('../Middlewares/auth.middleware');
const farmEp = require("../end-point/farm-ep");


router.post('/add-farm', auth, farmEp.CreateFarm);

router.get('/get-farms', auth, farmEp.getFarms);

router.get('/get-membership', auth, farmEp.getMemberShip);

router.get('/get-farms/byFarm-Id/:id', auth, farmEp.getFarmById);

router.post('/add-payment', auth, farmEp.CreatePayment);

router.get('/get-cropCount/:farmId', auth, farmEp.getCropCountByFarmId);


//cultivation
router.get("/get-user-ongoing-cul/:farmId", auth, farmEp.OngoingCultivaionGetById);

router.post("/enroll-crop/:farmId", auth, farmEp.enroll);


router.post("/members-phoneNumber-checker", farmEp.phoneNumberChecker);

router.put('/update-farm', auth, farmEp.UpdateFarm);

router.post('/create-new-staffmember/:farmId', auth, farmEp.CreateNewStaffMember);

router.get('/get-staffMmber-byId/:staffMemberId', auth, farmEp.getStaffMember)

router.put('/update-staffmember/:staffMemberId', auth, farmEp.updateStaffMember)

router.get('/get-renew', auth, farmEp.getrenew);

router.delete('/delete-farm/:farmId', auth, farmEp.deleteFarm);

router.get('/select-farm', auth, farmEp.getSelectFarm);

/////currect asset

router.post('/currentAsset/:farmId', auth, farmEp.handleAddFixedAsset);

router.get("/assets/:farmId", auth, farmEp.getAssetsByCategory);

router.get(
    "/currentAsset/:farmId",
    auth,
    farmEp.getAllCurrentAssets
);


///fixAsset


router.get('/fixed-assets/:category/:farmId', auth, farmEp.getFixedAssetsByCategory);

///fetch farmId

router.get('/get-farmName/:farmId', auth, farmEp.getFarmName);


module.exports = router;

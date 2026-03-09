const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const certificateEp = require("../end-point/certificate-ep");
const { upload } = require("../end-point/cropCalendarimages-ep");

//Fram certificate
router.get(
    "/get-farms-certificate/:farmId",
    auth,
    certificateEp.getFarmsCertificate,
);
router.post(
    "/certificate-payment/:farmId",
    auth,
    certificateEp.createCertificatePayment,
);

//Crop Certificate
router.get(
    "/get-crop-certificate/:farmId/:cropId",
    auth,
    certificateEp.getCropsCertificate,
);

//Create Crop Payment
router.post(
    "/certificate-crop-payment/:cropId",
    auth,
    certificateEp.createCropCertificatePayment,
);

router.get(
    "/get-crophave-certificate/:cropId",
    auth,
    certificateEp.getCropHvaeCertificate,
);

router.get(
    "/get-crop-certificate-byId/:cropId",
    auth,
    certificateEp.getCropCertificateByid,
);

// Tick Off update
router.put(
    "/update-questionnaire-item/:itemId",
    auth,
    certificateEp.updateQuestionItemByid,
);

// Photo Proof upload
router.post(
    "/questionnaire-item/upload-image/:itemId",
    auth,
    upload.single("image"),
    certificateEp.uploadQuestionnaireImage,
);

//Fetch Crop Name
router.get(
    "/get-cropName/:cropId", 
    auth, 
    certificateEp.getCropNames
);

//Fetch Farm Name
router.get(
    "/get-farmname/:farmId", 
    auth, 
    certificateEp.getFarmName
);

router.get(
    "/get-farmcertificate-crop/:farmId",
    auth,
    certificateEp.getFarmcertificateCrop,
);

router.get(
    "/get-farm-certificate/:farmId",
    auth,
    certificateEp.getFarmCertificate,
);

router.get(
    "/get-farmcertificatetask/:farmId",
    auth,
    certificateEp.getFarmCertificateTask,
);

router.delete(
    "/questionnaire-item/remove/:itemId",
    auth,
    certificateEp.removeQuestionnaireItem,
);

router.get(
    "/get-farms/:farmId", 
    auth, 
    certificateEp.getFarms
);

module.exports = router;

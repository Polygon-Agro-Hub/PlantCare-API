const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const certificateEp = require("../end-point/certificate-ep");
const { upload } = require("../end-point/crop-calendar-images-ep");

// Get Farm certificate
router.get(
    "/get-farms-certificate/:farmId",
    authenticate,
    certificateEp.getFarmsCertificate,
);

// Create Farm certificate payment
router.post(
    "/certificate-payment/:farmId",
    authenticate,
    certificateEp.createCertificatePayment,
);

// Crop Certificate
router.get(
    "/get-crop-certificate/:farmId/:cropId",
    authenticate,
    certificateEp.getCropsCertificate,
);

// Create Crop Payment
router.post(
    "/certificate-crop-payment/:cropId",
    authenticate,
    certificateEp.createCropCertificatePayment,
);

// Get Crop have certificate
router.get(
    "/get-crophave-certificate/:cropId",
    authenticate,
    certificateEp.getCropHvaeCertificate,
);

// Get Crop certificate by id
router.get(
    "/get-crop-certificate-byId/:cropId",
    authenticate,
    certificateEp.getCropCertificateByid,
);

// Update questionnaire item by id
router.put(
    "/update-questionnaire-item/:itemId",
    authenticate,
    certificateEp.updateQuestionItemByid,
);

// Photo Proof upload
router.post(
    "/questionnaire-item/upload-image/:itemId",
    authenticate,
    upload.single("image"),
    certificateEp.uploadQuestionnaireImage,
);

//Fetch Crop Name
router.get(
    "/get-cropName/:cropId", 
    authenticate, 
    certificateEp.getCropNames
);

//Fetch Farm Name
router.get(
    "/get-farmname/:farmId", 
    authenticate, 
    certificateEp.getFarmName
);

router.get(
    "/get-farmcertificate-crop/:farmId",
    authenticate,
    certificateEp.getFarmcertificateCrop,
);

router.get(
    "/get-farm-certificate/:farmId",
    authenticate,
    certificateEp.getFarmCertificate,
);

router.get(
    "/get-farmcertificatetask/:farmId",
    authenticate,
    certificateEp.getFarmCertificateTask,
);

router.delete(
    "/questionnaire-item/remove/:itemId",
    authenticate,
    certificateEp.removeQuestionnaireItem,
);

router.get(
    "/get-farms/:farmId", 
    authenticate, 
    certificateEp.getFarms
);

module.exports = router;

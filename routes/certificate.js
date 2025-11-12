const express = require('express');
const router = express.Router();
const auth = require('../Middlewares/auth.middleware');
const certificateEp = require("../end-point/certificate-ep");
const { upload } = require('../end-point/cropCalendarimages-ep');

//Fram certificate
router.get('/get-farms-certificate', auth, certificateEp.getFarmsCertificate);
router.post('/certificate-payment/:farmId', auth, certificateEp.createCertificatePayment);

//Crop Certificate
router.get('/get-crop-certificate', auth, certificateEp.getCropsCertificate);
router.post('/certificate-crop-payment/:cropId', auth, certificateEp.createCropCertificatePayment);

router.get('/get-crophave-certificate/:cropId', auth, certificateEp.getCropHvaeCertificate);

router.get('/get-crop-certificate-byId/:cropId', auth, certificateEp.getCropCertificateByid);

// Tick Off update
router.put('/update-questionnaire-item/:itemId', auth, certificateEp.updateQuestionItemByid);

// Photo Proof upload
router.post('/questionnaire-item/upload-image/:itemId', auth, upload.single('image'), certificateEp.uploadQuestionnaireImage);









module.exports = router;
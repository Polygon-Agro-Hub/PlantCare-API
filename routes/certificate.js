const express = require('express');
const router = express.Router();
const auth = require('../Middlewares/auth.middleware');
const certificateEp = require("../end-point/certificate-ep");

//Fram certificate
router.get('/get-farms-certificate', auth, certificateEp.getFarmsCertificate);
router.post('/certificate-payment/:farmId', auth, certificateEp.createCertificatePayment);

//Crop Certificate
router.get('/get-crop-certificate', auth, certificateEp.getCropsCertificate);
router.post('/certificate-crop-payment/:cropId', auth, certificateEp.createCropCertificatePayment);

router.get('/get-crophave-certificate/:cropId', auth, certificateEp.getCropHvaeCertificate);

router.get('/get-crop-certificate-byId/:cropId', auth, certificateEp.getCropCertificateByid);








module.exports = router;
const express = require("express");
const auth = require("../Middlewares/auth.middleware");
const userAuthEp = require("../end-point/userAuth-ep");
const router = express.Router();
const upload = require('../Middlewares/multer.middleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs:30 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 100 requests per windowMs
handler: (req, res /*, next*/) => {
        return res.status(429).json({
            status: "error",
            message: "User is blocked"
        });
    }}); 

router.post("/user-register", userAuthEp.SignupUser);

router.post("/user-login",authLimiter, userAuthEp.loginUser);

router.get("/user-profile", auth, userAuthEp.getProfileDetails);

router.put("/user-updatePhone", auth, userAuthEp.updatePhoneNumber);

router.post("/user-register-checker", userAuthEp.signupChecker);

router.put("/user-update-names", auth, userAuthEp.updateFirstLastName);

router.post('/registerBankDetails', auth, userAuthEp.registerBankDetails);

router.post('/upload-profile-image', auth, upload.single('profileImage'), userAuthEp.uploadProfileImage);

router.delete('/user-delete', auth, userAuthEp.deleteUser);

router.get('/user-feedback-options', userAuthEp.getFeedbackOptions);

module.exports = router;
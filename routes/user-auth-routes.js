const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const userAuthEp = require("../end-point/user-auth-ep");
const router = express.Router();
const upload = require("../middleware/multer.middleware");

router.post(
    "/user-register", 
    userAuthEp.SignupUser
);

router.post(
    "/user-login", 
    userAuthEp.loginUser
);

router.get(
    "/user-profile", 
    authenticate, 
    userAuthEp.getProfileDetails
);

router.put(
    "/user-updatePhone", 
    authenticate, 
    userAuthEp.updatePhoneNumber
);

router.post(
    "/user-register-checker", 
    userAuthEp.signupChecker
);

router.put(
    "/user-update-names", 
    authenticate, 
    userAuthEp.updateFirstLastName
);

router.post(
    "/registerBankDetails", 
    authenticate, 
    userAuthEp.registerBankDetails
);

router.post(
    "/upload-profile-image",
    authenticate,
    upload.single("profileImage"),
    userAuthEp.uploadProfileImage,
);

router.delete(
    "/user-delete", 
    authenticate, 
    userAuthEp.deleteUser
);

router.get(
    "/user-feedback-options", 
    userAuthEp.getFeedbackOptions
);

module.exports = router;

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const complainEp = require("../end-point/complain-ep");

router.post(
    "/add-complain", 
    authenticate, 
    complainEp.createComplain
);

router.get(
    "/get-complains", 
    authenticate, 
    complainEp.getComplains
);

router.get(
    "api/complain/reply/:id", 
    complainEp.getComplainReplyByid
);

router.get(
    "/get-complain-category", 
    complainEp.getComplainCategory
);

module.exports = router;

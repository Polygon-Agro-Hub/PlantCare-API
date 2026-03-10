const express = require("express");
const router = express.Router();
const staffEp = require("../end-point/staff-ep");
const authenticate = require('../middleware/auth.middleware');

router.get(
    '/get-supervisor&Laboror/:id', 
    authenticate, 
    staffEp.getFarmById
);

router.post(
    '/create-new-staffmember/:farmId', 
    authenticate, 
    staffEp.CreateNewStaffMember
);

module.exports = router
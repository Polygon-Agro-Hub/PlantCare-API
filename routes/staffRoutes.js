const express = require("express");
const router = express.Router();
const staffEp = require("../end-point/staff-ep");
const auth = require('../Middlewares/auth.middleware');


router.get('/get-supervisor&Laboror/:id', auth, staffEp.getFarmById);

router.post('/create-new-staffmember/:farmId', auth, staffEp.CreateNewStaffMember);

module.exports = router
const express = require("express");
const router = express.Router();
const marketPrice = require("../end-point/marketPrice-ep");
const auth = require("../middleware/auth.middleware");

router.get("/get-all-market",auth, marketPrice.getAllMarket);

module.exports = router;

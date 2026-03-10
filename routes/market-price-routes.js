const express = require("express");
const router = express.Router();
const marketPrice = require("../end-point/market-price-ep");
const authenticate = require("../middleware/auth.middleware");

router.get(
    "/get-all-market",
    authenticate, 
    marketPrice.getAllMarket
);

module.exports = router;

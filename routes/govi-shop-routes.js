const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const goviShopEp = require("../end-point/govi-shop-ep");

// Get shops with product count + search
router.get(
  "/shops",
  authenticate,
  goviShopEp.getShops
);

module.exports = router;
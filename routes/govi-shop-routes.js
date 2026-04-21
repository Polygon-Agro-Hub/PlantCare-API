const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const goviShopEp = require("../end-point/govi-shop-ep");

router.get(
  "/shops",
  authenticate,
  goviShopEp.getShops
);

router.get("/branches/:branchId/categories", authenticate, goviShopEp.getBranchCategories);
router.get("/branches/:branchId/products", authenticate, goviShopEp.getBranchProducts);

router.get("/products/:productId/variants", authenticate, goviShopEp.getProductVariants);


module.exports = router;
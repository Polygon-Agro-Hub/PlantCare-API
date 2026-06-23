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

router.post("/cart/item", authenticate, goviShopEp.upsertCartItem);
router.delete("/cart/item", authenticate, goviShopEp.removeCartItem);
router.get("/cart", authenticate, goviShopEp.getCart);

router.post("/checkout", authenticate, goviShopEp.placeOrder);

router.get(
  "/orders/:orderId/invoice",
  authenticate,
  goviShopEp.getOrderInvoice,
);

router.get("/get-all-orders", authenticate, goviShopEp.getAllOrders);

module.exports = router;
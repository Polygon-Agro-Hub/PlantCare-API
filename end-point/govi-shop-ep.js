const asyncHandler = require("express-async-handler");
const goviShopDao = require("../dao/govi-shop-dao");
const goviShopValidation = require("../validations/govi-shop-validation");

exports.getShops = asyncHandler(async (req, res) => {
  try {
    const { search = "" } = req.query;
    const userId = req.user.ownerId;

    const userDistrict = await goviShopDao.getUserDistrict(userId);

    if (!userDistrict) {
      return res.status(400).json({ message: "User district not found" });
    }

    const shops = await goviShopDao.getShops(search, userDistrict);

    res.status(200).json(shops || []);
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({ message: "Failed to fetch shops" });
  }
});

exports.getBranchCategories = asyncHandler(async (req, res) => {
  try {
    const { branchId } = req.params;
    const categories = await goviShopDao.getBranchCategories(branchId);
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching branch categories:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

exports.getBranchProducts = asyncHandler(async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId || isNaN(Number(branchId)) || Number(branchId) <= 0) {
      return res.status(400).json({ message: "Invalid branchId in parameters" });
    }
    const { categoryId = null, search = "" } = await goviShopValidation.getBranchProductsQuerySchema.validateAsync(req.query);
    const products = await goviShopDao.getBranchProducts(
      Number(branchId),
      categoryId ? Number(categoryId) : null,
      search,
    );
    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching branch products:", error);
    res.status(500).json({ message: error.message || "Failed to fetch products" });
  }
});

exports.getProductVariants = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId || isNaN(Number(productId)) || Number(productId) <= 0) {
      return res.status(400).json({ message: "Invalid productId in parameters" });
    }
    const { branchId } = await goviShopValidation.getProductVariantsQuerySchema.validateAsync(req.query);

    const variants = await goviShopDao.getProductVariants(Number(productId), Number(branchId));

    if (!variants || variants.length === 0) {
      return res.status(404).json({ message: "No variants found" });
    }

    res.status(200).json(variants);
  } catch (error) {
    console.error("Error fetching product variants:", error);
    res.status(500).json({ message: error.message || "Failed to fetch variants" });
  }
});

exports.upsertCartItem = asyncHandler(async (req, res) => {
  try {
    const validatedBody = await goviShopValidation.upsertCartItemSchema.validateAsync(req.body);
    const farmerId = req.user.id;
    const {
      branchId,
      productId,
      subProdId = null,
      subProdColorId = null,
      equipColorId = null,
      qty,
    } = validatedBody;

    const result = await goviShopDao.upsertCartItem({
      farmerId,
      branchId,
      productId,
      subProdId,
      subProdColorId,
      equipColorId,
      qty: Number(qty),
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error upserting cart item:", error);
    res.status(500).json({ message: error.message || "Failed to update cart" });
  }
});

exports.removeCartItem = asyncHandler(async (req, res) => {
  try {
    const validatedBody = await goviShopValidation.removeCartItemSchema.validateAsync(req.body);
    const farmerId = req.user.id;
    const {
      branchId,
      productId,
      subProdId = null,
      subProdColorId = null,
      equipColorId = null,
    } = validatedBody;

    await goviShopDao.removeCartItem({
      farmerId,
      branchId,
      productId,
      subProdId,
      subProdColorId,
      equipColorId,
    });

    res.status(200).json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ message: error.message || "Failed to remove cart item" });
  }
});

exports.getCart = asyncHandler(async (req, res) => {
  try {
    const farmerId = req.user.id;
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const cart = await goviShopDao.getCart(farmerId, branchId);
    res.status(200).json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

exports.placeOrder = asyncHandler(async (req, res) => {
  try {
    const validatedBody = await goviShopValidation.placeOrderSchema.validateAsync(req.body);
    const farmerId = req.user.id;
    const { branchId } = validatedBody;

    const result = await goviShopDao.placeOrder(farmerId, Number(branchId));
    res.status(200).json(result);
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: error.message || "Failed to place order" });
  }
});

exports.getOrderInvoice = asyncHandler(async (req, res) => {
  try {
    const { orderId } = req.params;
    const farmerId = req.user.id;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({ message: "Invalid orderId" });
    }

    const invoice = await goviShopDao.getOrderInvoice(
      Number(orderId),
      farmerId,
    );

    if (!invoice) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Error fetching order invoice:", error);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});


exports.getAllOrders = asyncHandler(async (req, res) => {
  try {
    const farmerId = req.user.id;
    const orders = await goviShopDao.getAllOrders(farmerId);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

exports.cleanExpiredCarts = asyncHandler(async (req, res) => {
  try {
    const result = await goviShopDao.cleanExpiredCarts();
    res.status(200).json({
      status: "success",
      message: "Expired carts cleaned successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error cleaning expired carts:", error);
    res.status(500).json({ message: "Failed to clean expired carts" });
  }
});

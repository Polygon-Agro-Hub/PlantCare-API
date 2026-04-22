const asyncHandler = require("express-async-handler");
const goviShopDao = require("../dao/govi-shop-dao");

exports.getShops = asyncHandler(async (req, res) => {
  try {
    const { search = "" } = req.query;
    const shops = await goviShopDao.getShops(search);

    if (!shops || shops.length === 0) {
      return res.status(404).json({ message: "No shops found" });
    }

    res.status(200).json(shops);
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
    const { categoryId = null } = req.query;
    const products = await goviShopDao.getBranchProducts(branchId, categoryId);

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching branch products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

exports.getProductVariants = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    const variants = await goviShopDao.getProductVariants(productId, branchId);

    if (!variants || variants.length === 0) {
      return res.status(404).json({ message: "No variants found" });
    }

    res.status(200).json(variants);
  } catch (error) {
    console.error("Error fetching product variants:", error);
    res.status(500).json({ message: "Failed to fetch variants" });
  }
});

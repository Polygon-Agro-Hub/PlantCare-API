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

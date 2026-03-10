const currentAssetsDao = require("../dao/current-assets-dao");
const asyncHandler = require("express-async-handler");
const {
  getAllCurrentAssetsSchema,
  addCurrectAssetSchema,
  getAssetsByCategorySchema,
  deleteAssetSchema,
  deleteAssetParamsSchema,
} = require("../validations/current-assets-validation");

exports.handleAddCurrectAsset = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.ownerId;
    const staffId = req.user.id;
    const userFarmId = req.user.farmId;

    const {
      category,
      asset,
      farmId: bodyFarmId,
      brand,
      batchNum,
      volume,
      unit,
      numberOfUnits,
      unitPrice,
      totalPrice,
      purchaseDate,
      expireDate,
      warranty,
      status,
    } = await addCurrectAssetSchema.validateAsync(req.body);

    const effectiveFarmId = bodyFarmId || userFarmId;
    if (!effectiveFarmId) {
      return res.status(400).json({
        status: "error",
        message: "Farm ID is required.",
      });
    }

    const volumeInt = parseInt(volume, 10);
    if (isNaN(volumeInt)) {
      return res.status(400).json({
        status: "error",
        message: "Volume must be a valid number.",
      });
    }

    const formattedPurchaseDate = new Date(purchaseDate)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const formattedExpireDate = new Date(expireDate)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const userResults = await currentAssetsDao.checkUserExists(userId);
    if (userResults.length === 0) {
      return res.status(400).json({
        status: "error",
        message: `User with ID ${userId} does not exist in users table. Cannot create asset.`,
      });
    }

    const staffResults = await currentAssetsDao.checkStaffExists(
      staffId,
      effectiveFarmId,
    );
    const staffExists = staffResults.length > 0;

    const payload = {
      userId,
      staffId,
      staffExists,
      farmId: effectiveFarmId,
      category,
      asset,
      brand,
      batchNum,
      volumeInt,
      unit,
      numberOfUnits,
      unitPrice,
      totalPrice,
      formattedPurchaseDate,
      formattedExpireDate,
      warranty,
      status,
    };

    const existingAssets = await currentAssetsDao.checkExistingAsset(
      userId,
      category,
      asset,
      brand,
      batchNum,
      effectiveFarmId,
    );

    if (existingAssets.length > 0) {
      const existingAsset = existingAssets[0];

      await currentAssetsDao.updateAsset(existingAsset, payload);
      await currentAssetsDao.insertAssetRecord(
        existingAsset.id,
        numberOfUnits,
        totalPrice,
      );

      return res.status(200).json({
        status: "success",
        message: "Asset updated successfully",
      });
    } else {
      const insertResult = await currentAssetsDao.insertAsset(payload);
      await currentAssetsDao.insertAssetRecord(
        insertResult.insertId,
        numberOfUnits,
        totalPrice,
      );

      return res.status(201).json({
        status: "success",
        message: "New asset created successfully",
      });
    }
  } catch (err) {
    console.error("Error handling fixed asset:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Server error, please try again later.",
    });
  }
});

exports.getAssetsByCategory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = await getAssetsByCategorySchema.validateAsync(
      req.query,
    );
    const assets = await currentAssetsDao.getAssetsByCategory(userId, category);

    if (assets.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No assets found for this category.",
      });
    }
    return res.status(200).json({
      assets,
    });
  } catch (err) {
    console.error("Error fetching assets by category:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Server error, please try again later.",
    });
  }
});

exports.getAllCurrentAssets = asyncHandler(async (req, res) => {
  try {
    await getAllCurrentAssetsSchema.validateAsync({ userId: req.user.id });

    const userId = req.user.id;

    const results = await currentAssetsDao.getAllCurrentAssets(userId);

    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No assets found for the user",
      });
    }

    return res.status(200).json({
      status: "success",
      currentAssetsByCategory: results,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: `An error occurred: ${err.message}`,
    });
  }
});

exports.deleteAsset = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const { category, assetId } = await deleteAssetParamsSchema.validateAsync(
      req.params,
    );

    const { numberOfUnits, totalPrice } = await deleteAssetSchema.validateAsync(
      req.body,
    );

    const results = await currentAssetsDao.getAssetById(
      userId,
      category,
      assetId,
    );

    if (results.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Asset not found.",
      });
    }

    const currentAsset = results[0];
    const newNumOfUnit = currentAsset.numOfUnit - numberOfUnits;
    const newTotal = currentAsset.total - totalPrice;

    if (numberOfUnits > currentAsset.numOfUnit) {
      return res.status(400).json({
        status: "error",
        message: "Cannot remove more units than available.",
      });
    }

    if (totalPrice > currentAsset.total) {
      return res.status(400).json({
        status: "error",
        message: "Cannot remove more value than available.",
      });
    }

    if (newNumOfUnit < 0 || newTotal < 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid operation: insufficient units or value.",
      });
    }

    await currentAssetsDao.insertMinusAssetRecord(
      currentAsset.id,
      numberOfUnits,
      totalPrice,
    );

    if (newNumOfUnit === 0 && newTotal === 0) {
      await currentAssetsDao.deleteAsset(userId, category, assetId);

      return res.status(200).json({
        status: "success",
        message: "Asset removed successfully.",
      });
    } else {
      await currentAssetsDao.updateAssetAfterRemoval(
        newNumOfUnit,
        newTotal,
        userId,
        category,
        assetId,
      );

      return res.status(200).json({
        status: "success",
        message: "Asset updated successfully.",
      });
    }
  } catch (err) {
    console.error("Error deleting asset:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Server error, please try again later.",
    });
  }
});

exports.getCurrectAssetAlredayHaveByUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const results =
      await currentAssetsDao.getCurrectAssetAlredayHaveByUser(userId);

    return res.status(200).json({
      status: "success",
      currentAssetsByCategory: results.length === 0 ? [] : results,
    });
  } catch (err) {
    console.error("Error in getCurrectAssetAlredayHaveByUser:", err);
    res.status(500).json({
      status: "error",
      message: `An error occurred: ${err.message}`,
    });
  }
});

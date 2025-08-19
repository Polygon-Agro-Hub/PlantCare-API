const currentAssetsDao = require("../dao/currentAsset-dao");
const asyncHandler = require("express-async-handler");
const {
  getAllCurrentAssetsSchema,
} = require("../validations/currentAsset-validation");

const {
  getAssetsByCategorySchema,
} = require("../validations/currentAsset-validation");

const { deleteAssetSchema, deleteAssetParamsSchema } = require('../validations/currentAsset-validation');
const { addFixedAssetSchema } = require('../validations/currentAsset-validation');
const fixedAssetDao = require('../dao/currentAsset-dao');

exports.getAllCurrentAssets = asyncHandler(async (req, res) => {
  try {
    await getAllCurrentAssetsSchema.validateAsync({ userId: req.user.id });

    const userId = req.user.id;
    console.log(userId, "userId in getAllCurrentAssets");

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

exports.getAssetsByCategory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = await getAssetsByCategorySchema.validateAsync(
      req.query
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


exports.deleteAsset = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, assetId } = req.params;

    await deleteAssetParamsSchema.validateAsync(req.params);

    const { numberOfUnits, totalPrice } = await deleteAssetSchema.validateAsync(req.body);

    const assets = await currentAssetsDao.getCurrentAsset(userId, category, assetId);
    if (assets.length === 0) {
      return res.status(404).json({ message: 'Asset not found for this user.' });
    }

    const currentAsset = assets[0];
    const newNumOfUnit = currentAsset.numOfUnit - numberOfUnits;
    const newTotal = currentAsset.total - totalPrice;

    if (newNumOfUnit < 0 || newTotal < 0) {
      return res.status(400).json({ message: 'Invalid operation: insufficient units to deduct.' });
    }

    const recordData = {
      currentAssetId: currentAsset.id,
      numOfPlusUnit: 0,
      numOfMinUnit: numberOfUnits,
      totalPrice: totalPrice,
    };

    if (newNumOfUnit === 0 && newTotal === 0) {
      await currentAssetsDao.deleteAsset(userId, category, assetId);
      await currentAssetsDao.insertRecord(recordData.currentAssetId, recordData.numOfPlusUnit, recordData.numOfMinUnit, recordData.totalPrice);
      return res.status(200).json({ message: 'Asset removed successfully.' });
    } else {
      await currentAssetsDao.updateAsset(userId, category, assetId, newNumOfUnit, newTotal);
      await currentAssetsDao.insertRecord(currentAsset.id, 0, numberOfUnits, totalPrice);
      return res.status(200).json({ message: 'Asset updated successfully.' });
    }
  } catch (err) {
    console.error('Error deleting asset:', err);
    if (err.isJoi) {
      return res.status(400).json({
        status: 'error',
        message: err.details[0].message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error, please try again later.',
    });
  }
});



exports.handleAddFixedAsset = async (req, res) => {
  const userId = req.user.id;
  const { category, asset, brand, batchNum, volume, unit, numberOfUnits, unitPrice, totalPrice, purchaseDate, expireDate, status } = req.body;

  try {
    await addFixedAssetSchema.validateAsync(req.body);

    const volumeFloat = parseFloat(volume);

    const formattedPurchaseDate = new Date(purchaseDate).toISOString().slice(0, 19).replace('T', ' ');
    const formattedExpireDate = new Date(expireDate).toISOString().slice(0, 19).replace('T', ' ');

    const existingAssets = await fixedAssetDao.checkAssetExists(userId, category, asset);

    if (existingAssets.length > 0) {
      const existingAsset = existingAssets[0];
      const updatedNumOfUnits = existingAsset.numOfUnit + numberOfUnits;
      const updatedTotalPrice = existingAsset.total + totalPrice;

      const updatedValues = [updatedNumOfUnits, updatedTotalPrice, volumeFloat, unitPrice, formattedPurchaseDate, formattedExpireDate, status];

      await fixedAssetDao.updateAsset(updatedValues, existingAsset.id);

      await fixedAssetDao.insertAssetRecord([existingAsset.id, numberOfUnits, totalPrice]);

      return res.status(200).json({
        status: 'success',
        message: 'Asset updated successfully',
      });
    } else {
      const insertValues = [userId, category, asset, brand, batchNum, unit, volumeFloat, numberOfUnits, unitPrice, totalPrice, formattedPurchaseDate, formattedExpireDate, status];

      const newAssetId = await fixedAssetDao.insertAsset(insertValues);

      await fixedAssetDao.insertAssetRecord([newAssetId, numberOfUnits, totalPrice]);

      return res.status(200).json({
        status: 'success',
        message: 'Asset added successfully',
      });
    }
  } catch (err) {
    console.error('Error in handleAddFixedAsset:', err);
    if (err.isJoi) {
      return res.status(400).json({
        status: 'error',
        message: err.details[0].message,
      });
    }
    res.status(500).json({ status: 'error', message: 'An error occurred while processing the request.' });
  }
};


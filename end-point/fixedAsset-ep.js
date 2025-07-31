const {
  fixedAssetsSchema,
  deleteFixedAssetSchema,
} = require("../validations/fixedAssest-validation");
const fixedAssetsDao = require("../dao/fixedAsset-dao");
const asyncHandler = require("express-async-handler");

exports.getFixedAssetsByCategoryAndUser = asyncHandler(async (req, res) => {
  try {
    await fixedAssetsSchema.validateAsync(req.params);

    const { category } = req.params;
    const userId = req.user.id;

    const fixedAssets = await fixedAssetsDao.getFixedAssetsByCategoryAndUser(
      category,
      userId
    );

    if (!fixedAssets.length) {
      return res.status(404).json({
        status: "error",
        message: "No fixed assets found for this category and user.",
      });
    }

    return res.status(200).json({
      message: "Fixed assets retrieved successfully",
      data: fixedAssets,
    });
  } catch (err) {
    console.error("Error:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching fixed assets.",
    });
  }
});

exports.deleteFixedAsset = asyncHandler(async (req, res) => {
  try {
    await deleteFixedAssetSchema.validateAsync(req.body);

    const { ids } = req.body;
    const idArray = Array.isArray(ids) ? ids : [ids];

    const deleteResult = await fixedAssetsDao.deleteFixedAsset(idArray);

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "No matching fixed assets found for deletion.",
      });
    }

    return res.status(200).json({
      message: `Successfully deleted ${deleteResult.affectedRows} fixed asset(s).`,
    });
  } catch (err) {
    console.error("Error:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting fixed assets.",
    });
  }
});



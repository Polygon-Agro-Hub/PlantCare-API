const asyncHandler = require("express-async-handler");
const {
  addFixedAssetSchema,
} = require("../validations/fixed-assest-validation");
const fixedAssetDao = require("../dao/fixed-assets-dao");

const formatDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const formatDateTime = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 19).replace("T", " ");
};

exports.addFixedAsset = asyncHandler(async (req, res) => {
  try {
    const { error, value } = addFixedAssetSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ message: error.details.map((d) => d.message).join(", ") });
    }

    const userId = req.user.ownerId;
    const staffId = req.user.id;
    const includeStaffId = staffId && staffId !== userId;

    const {
      category,
      farmId,
      ownership,
      type,
      floorArea,
      generalCondition,
      extentha,
      extentac,
      extentp,
      landFenced,
      perennialCrop,
      asset,
      assetType,
      mentionOther,
      brand,
      numberOfUnits,
      unitPrice,
      totalPrice,
      warranty,
      issuedDate,
      purchaseDate,
      expireDate,
      warrantystatus,
      startDate,
      durationYears,
      durationMonths,
      leastAmountAnnually,
      permitFeeAnnually,
      paymentAnnually,
      estimateValue,
      landownership,
      assetname,
      toolbrand,
    } = value;

    const formattedIssuedDate = formatDate(issuedDate);
    const formattedPurchaseDate = formatDate(purchaseDate);
    const formattedExpireDate = formatDate(expireDate);
    const formattedStartDate = formatDate(startDate);

    const fixedAssetResult = await fixedAssetDao.insertFixedAsset(
      userId,
      staffId,
      includeStaffId,
      category,
      farmId,
    );
    const fixedAssetId = fixedAssetResult.insertId;

    if (category === "Building and Infrastructures") {
      const farmResult = await fixedAssetDao.getFarmDistrict(farmId);
      if (!farmResult || farmResult.length === 0) {
        return res
          .status(404)
          .json({ message: "Farm not found for the provided farmId." });
      }

      const buildingResult = await fixedAssetDao.insertBuildingAsset(
        fixedAssetId,
        type,
        floorArea,
        ownership,
        generalCondition,
        farmResult[0].district,
      );
      const buildingAssetId = buildingResult.insertId;

      switch (ownership) {
        case "Own Building (with title ownership)":
          await fixedAssetDao.insertOwnershipOwner(
            "buildingAssetId",
            buildingAssetId,

            estimateValue,
          );
          break;
        case "Leased Building":
          await fixedAssetDao.insertOwnershipLease(
            "buildingAssetId",
            buildingAssetId,
            formattedStartDate,
            durationYears,
            durationMonths,
            leastAmountAnnually,
          );
          break;
        case "Permitted Building":
          await fixedAssetDao.insertOwnershipPermit(
            "buildingAssetId",
            buildingAssetId,
            formattedIssuedDate,
            permitFeeAnnually,
          );
          break;
        case "Shared / No Ownership":
          await fixedAssetDao.insertOwnershipShared(
            "buildingAssetId",
            buildingAssetId,
            paymentAnnually,
          );
          break;
        default:
          return res.status(400).json({
            message: "Invalid ownership type provided for building asset.",
          });
      }

      return res.status(201).json({
        message: "Building fixed asset with ownership created successfully.",
      });
    } else if (category === "Land") {
      const farmResult = await fixedAssetDao.getFarmDistrict(farmId);
      if (!farmResult || farmResult.length === 0) {
        return res
          .status(404)
          .json({ message: "Farm not found for the provided farmId." });
      }

      const landResult = await fixedAssetDao.insertLandAsset(
        fixedAssetId,
        extentha,
        extentac,
        extentp,
        landownership,
        farmResult[0].district,
        landFenced,
        perennialCrop,
      );
      const landAssetId = landResult.insertId;

      switch (landownership) {
        case "Own":
          await fixedAssetDao.insertOwnershipOwner(
            "landAssetId",
            landAssetId,

            estimateValue,
          );
          break;
        case "Lease":
          await fixedAssetDao.insertOwnershipLease(
            "landAssetId",
            landAssetId,
            formattedStartDate,
            durationYears,
            durationMonths,
            leastAmountAnnually,
          );
          break;
        case "Permitted":
          await fixedAssetDao.insertOwnershipPermit(
            "landAssetId",
            landAssetId,
            formattedIssuedDate,
            permitFeeAnnually,
          );
          break;
        case "Shared":
          await fixedAssetDao.insertOwnershipShared(
            "landAssetId",
            landAssetId,
            paymentAnnually,
          );
          break;
        default:
          return res.status(400).json({
            message: "Invalid ownership type provided for land asset.",
          });
      }

      return res.status(201).json({
        message: "Land fixed asset with ownership created successfully.",
      });
    } else if (category === "Machine and Vehicles" || category === "Tools") {
      const assetLabel = category === "Tools" ? assetname : asset;
      const brandLabel = category === "Tools" ? toolbrand : brand;

      const machResult = await fixedAssetDao.insertMachToolsAsset(
        fixedAssetId,
        assetLabel,
        assetType,
        mentionOther,
        brandLabel,
        numberOfUnits,
        unitPrice,
        totalPrice,
        warranty,
      );
      const machToolsId = machResult.insertId;

      if (warranty === "yes" || warranty === "no") {
        await fixedAssetDao.insertMachToolsWarranty(
          machToolsId,
          formattedPurchaseDate,
          formattedExpireDate,
          warranty,
        );
        return res.status(201).json({
          message:
            "Machine and tools fixed asset with warranty created successfully.",
        });
      }

      return res.status(201).json({
        message:
          "Machine and tools fixed asset created successfully without warranty.",
      });
    } else {
      return res.status(400).json({ message: "Invalid category provided." });
    }
  } catch (err) {
    console.error("Error adding fixed asset:", err);
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

exports.getFixedAssetsByCategory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;

    const results = await fixedAssetDao.getAssetsByCategory(userId, category);

    return res.status(200).json({
      message: "Fixed assets retrieved successfully.",
      data: results,
    });
  } catch (err) {
    console.error("Error fetching fixed assets:", err);
    if (err.message === "INVALID_CATEGORY") {
      return res.status(400).json({ message: "Invalid category provided." });
    }
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

exports.getFixedAssetDetailsById = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.ownerId;
    const { assetId, category } = req.params;

    const assetResults = await fixedAssetDao.getAssetDetailById(
      userId,
      assetId,
      category,
    );

    if (assetResults.length === 0) {
      return res.status(404).json({ message: "Asset not found." });
    }

    const asset = assetResults[0];
    const ownershipType = asset.ownership;

    const ownershipResults = await fixedAssetDao.getOwnershipDetails(
      category,
      ownershipType,
      asset.id,
    );
    asset.ownershipDetails = ownershipResults[0] || null;

    return res.status(200).json(asset);
  } catch (err) {
    console.error("Error fetching fixed asset details:", err);
    if (err.message === "INVALID_CATEGORY") {
      return res.status(400).json({ message: "Invalid category provided." });
    }
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

exports.updateFixedAsset = asyncHandler(async (req, res) => {
  try {
    const staffId = req.user.id;
    const userId = req.user.ownerId;
    const { assetId, category } = req.params;
    const assetData = req.body;

    const ownershipDetails = assetData.ownershipDetails || {};
    const { ownership, oldOwnership } = assetData;
    const ownershipChanged = ownership !== oldOwnership;

    if (category === "Land") {
      await fixedAssetDao.updateLandAsset(assetData, userId);
      if (staffId !== userId)
        await fixedAssetDao.updateFixedAssetUpdatedBy(
          staffId,
          assetData.faId,
          userId,
        );

      const idField = "landAssetId";
      const idValue = assetData.id;

      if (ownershipChanged) {
        const tableMap = {
          Own: "ownershipownerfixedasset",
          Lease: "ownershipleastfixedasset",
          Permitted: "ownershippermitfixedasset",
          Shared: "ownershipsharedfixedasset",
        };
        await fixedAssetDao.deleteOwnershipExcept(
          idField,
          idValue,
          tableMap[ownership],
        );
        await _insertOwnershipByType(
          "Land",
          ownership,
          idField,
          idValue,
          ownershipDetails,
        );
      } else {
        await _updateOwnershipByType(
          "Land",
          ownership,
          idField,
          assetId,
          ownershipDetails,
        );
      }

      return res
        .status(200)
        .json({ message: "Asset and ownership details updated successfully." });
    } else if (category === "Building and Infrastructures") {
      await fixedAssetDao.updateBuildingAsset(assetData, userId);
      if (staffId !== userId)
        await fixedAssetDao.updateFixedAssetUpdatedBy(
          staffId,
          assetData.faId,
          userId,
        );

      const idField = "buildingAssetId";
      const idValue = assetData.id;

      if (ownershipChanged) {
        const tableMap = {
          "Own Building (with title ownership)": "ownershipownerfixedasset",
          "Leased Building": "ownershipleastfixedasset",
          "Permitted Building": "ownershippermitfixedasset",
          "Shared / No Ownership": "ownershipsharedfixedasset",
        };
        await fixedAssetDao.deleteOwnershipExcept(
          idField,
          idValue,
          tableMap[ownership],
        );
        await _insertOwnershipByType(
          "Building and Infrastructures",
          ownership,
          idField,
          idValue,
          ownershipDetails,
        );
      } else {
        await _updateOwnershipByType(
          "Building and Infrastructures",
          ownership,
          idField,
          assetId,
          ownershipDetails,
        );
      }

      return res
        .status(200)
        .json({ message: "Asset and ownership details updated successfully." });
    } else if (category === "Machine and Vehicles" || category === "Tools") {
      const warrantyDetails = assetData.ownershipDetails || {};

      await fixedAssetDao.updateMachToolsAsset(assetData, userId);
      if (staffId !== userId)
        await fixedAssetDao.updateFixedAssetUpdatedBy(
          staffId,
          assetData.faId,
          userId,
        );
      await fixedAssetDao.updateMachToolsWarranty(
        assetId,
        formatDateTime(warrantyDetails.purchaseDate) || null,
        formatDateTime(warrantyDetails.expireDate) || null,
        warrantyDetails.warrantystatus || null,
      );

      return res
        .status(200)
        .json({ message: "Asset and ownership details updated successfully." });
    } else {
      return res.status(400).json({ message: "Invalid category provided." });
    }
  } catch (err) {
    console.error("Error updating fixed asset:", err);
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

exports.deleteFixedAsset = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetId, category } = req.params;

    await fixedAssetDao.deleteFixedAssetWithOwnership(
      userId,
      assetId,
      category,
    );

    return res
      .status(200)
      .json({ message: "Asset and ownership details deleted successfully." });
  } catch (err) {
    console.error("Error deleting fixed asset:", err);
    if (err.message === "INVALID_CATEGORY") {
      return res.status(400).json({ message: "Invalid category provided." });
    }
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

async function _insertOwnershipByType(
  category,
  ownership,
  idField,
  idValue,
  details,
) {
  const d = details;
  const fmt = formatDateTime;

  const insertMap = {
    "Building and Infrastructures": {
      "Own Building (with title ownership)": () =>
        fixedAssetDao.insertOwnershipOwner(
          idField,
          idValue,

          d.estimateValue || null,
        ),
      "Leased Building": () =>
        fixedAssetDao.insertOwnershipLease(
          idField,
          idValue,
          d.startDate || null,
          String(d.durationYears ?? 0),
          String(d.durationMonths ?? 0),
          d.leastAmountAnnually || null,
        ),
      "Permitted Building": () =>
        fixedAssetDao.insertOwnershipPermit(
          idField,
          idValue,
          d.issuedDate || null,
          d.permitFeeAnnually || null,
        ),
      "Shared / No Ownership": () =>
        fixedAssetDao.insertOwnershipShared(
          idField,
          idValue,
          d.paymentAnnually || null,
        ),
    },
    Land: {
      Own: () =>
        fixedAssetDao.insertOwnershipOwner(
          idField,
          idValue,

          d.estimateValue || null,
        ),
      Lease: () =>
        fixedAssetDao.insertOwnershipLease(
          idField,
          idValue,
          d.startDate || null,
          String(d.durationYears ?? 0),
          String(d.durationMonths ?? 0),
          d.leastAmountAnnually || null,
        ),
      Permitted: () =>
        fixedAssetDao.insertOwnershipPermit(
          idField,
          idValue,
          fmt(d.issuedDate) || null,
          d.permitFeeAnnually || null,
        ),
      Shared: () =>
        fixedAssetDao.insertOwnershipShared(
          idField,
          idValue,
          d.paymentAnnually || null,
        ),
    },
  };

  const fn = insertMap[category]?.[ownership];
  if (fn) await fn();
}

async function _updateOwnershipByType(
  category,
  ownership,
  idField,
  assetId,
  details,
) {
  const d = details;
  const fmt = formatDateTime;

  const updateMap = {
    "Building and Infrastructures": {
      "Own Building (with title ownership)": () =>
        fixedAssetDao.updateOwnershipOwner(
          idField,
          assetId,

          d.estimateValue || null,
        ),
      "Leased Building": () =>
        fixedAssetDao.updateOwnershipLease(
          idField,
          assetId,
          fmt(d.startDate) || null,
          String(d.durationYears ?? 0),
          String(d.durationMonths ?? 0),
          d.leastAmountAnnually || null,
        ),
      "Permitted Building": () =>
        fixedAssetDao.updateOwnershipPermit(
          idField,
          assetId,
          fmt(d.issuedDate) || null,
          d.permitFeeAnnually || null,
        ),
      "Shared / No Ownership": () =>
        fixedAssetDao.updateOwnershipShared(
          idField,
          assetId,
          d.paymentAnnually || null,
        ),
    },
    Land: {
      Own: () =>
        fixedAssetDao.updateOwnershipOwner(
          idField,
          assetId,

          d.estimateValue || null,
        ),
      Lease: () =>
        fixedAssetDao.updateOwnershipLease(
          idField,
          assetId,
          fmt(d.startDate) || null,
          String(d.durationYears ?? 0),
          String(d.durationMonths ?? 0),
          d.leastAmountAnnually || null,
        ),
      Permitted: () =>
        fixedAssetDao.updateOwnershipPermit(
          idField,
          assetId,
          fmt(d.issuedDate) || null,
          d.permitFeeAnnually || null,
        ),
      Shared: () =>
        fixedAssetDao.updateOwnershipShared(
          idField,
          assetId,
          d.paymentAnnually || null,
        ),
    },
  };

  const fn = updateMap[category]?.[ownership];
  if (fn) await fn();
}

const asyncHandler = require("express-async-handler");
const farmDao = require("../dao/farm-dao");
const {
    createFarm,
    createPayment,
    signupCheckerSchema,
    updateFarm,
    createStaffMember,
    getSlaveCropCalendarDaysSchema,
    nicChecker,
} = require("../validations/farm-validation");
const delectfilesOnS3 = require("../Middlewares/s3delete");
const delectfloders3 = require("../Middlewares/s3folderdelete");
const db = require("../startup/database");
const {
    getAssetsByCategorySchema,
} = require("../validations/currentAsset-validation");

const {
    ongoingCultivationSchema,
    enrollSchema,
} = require("../validations/farm-validation");
const e = require("express");

exports.CreateFarm = asyncHandler(async (req, res) => {
    console.log("Farm creation request:", req.body);

    try {
        const userId = req.user.id;
        const input = { ...req.body, userId };

        console.log("User ID:", userId);

        const { value, error } = createFarm.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        console.log("Validated input:", value);

        const {
            farmName,
            farmIndex,
            farmImage,
            extentha,
            extentac,
            extentp,
            district,
            plotNo,
            street,
            city,
            staffCount,
            appUserCount,
            staff,
        } = value;

        const result = await farmDao.createFarmWithStaff({
            userId,
            farmName,
            farmImage,
            farmIndex,
            extentha,
            extentac,
            extentp,
            district,
            plotNo,
            street,
            city,
            staffCount,
            appUserCount,
            staff,
        });

        console.log("Farm creation result:", result);

        res.status(201).json({
            status: "success",
            message: "Farm and staff created successfully.",
            farmId: result.farmId,
            regCode: result.regCode,
            staffIds: result.staffIds,
            totalStaffCreated: result.staffIds.length,
        });
    } catch (err) {
        console.error("Error creating farm:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
});

exports.getFarms = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farms = await farmDao.getAllFarmByUserId(userId);
        console.log("far,ss", farms);

        if (!farms || farms.length === 0) {
            return res.status(404).json({ message: "No farms found" });
        }

        res.status(200).json(farms);
    } catch (error) {
        console.error("Error fetching farms:", error);
        res.status(500).json({ message: "Failed to fetch farms" });
    }
});

exports.getFarmById = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.id;
        const userId = req.user.id;

        const farmData = await farmDao.getFarmByIdWithStaff(farmId, userId);

        if (!farmData) {
            return res.status(404).json({ message: "Farm not found" });
        }

        res.status(200).json(farmData);
    } catch (error) {
        console.error("Error fetching farm:", error);
        res.status(500).json({ message: "Failed to fetch farm" });
    }
});

exports.getMemberShip = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const userMembership = await farmDao.getMemberShip(userId);

        if (!userMembership) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            data: userMembership,
        });
    } catch (error) {
        console.error("Error fetching user membership:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user membership",
        });
    }
});

exports.CreatePayment = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const input = { ...req.body, userId };

        console.log("Payment request data:", input);

        const { value, error } = createPayment.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        const { payment, plan, expireDate } = value;

        const result = await farmDao.createPaymentAndUpdateMembership({
            userId,
            payment,
            plan,
            expireDate,
        });

        res.status(201).json({
            status: "success",
            message: "Payment processed and membership updated successfully.",
            paymentId: result.paymentId,
            userUpdated: result.userUpdated,
        });
    } catch (err) {
        console.error("Error processing payment:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
});

//////////////cultivation

exports.OngoingCultivaionGetById = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farmId = req.params.farmId;

        if (!farmId) {
            return res.status(400).json({
                status: "error",
                message: "Farm ID is required",
            });
        }

        if (isNaN(farmId)) {
            return res.status(400).json({
                status: "error",
                message: "Farm ID must be a valid number",
            });
        }

        farmDao.getOngoingCultivationsByUserIdAndFarmId(
            userId,
            farmId,
            (err, results) => {
                if (err) {
                    console.error("Error fetching data from DAO:", err);
                    return res.status(500).json({
                        status: "error",
                        message: "An error occurred while fetching data.",
                    });
                }
                if (results.length === 0) {
                    return res.status(404).json({
                        status: "error",
                        message: "No ongoing cultivation found for this user and farm",
                    });
                }
                res.status(200).json(results);
            },
        );
    } catch (err) {
        console.error("Error in OngoingCultivationGetById:", err);
        res
            .status(500)
            .json({ status: "error", message: "Internal Server Error!" });
    }
});

exports.enroll = asyncHandler(async (req, res) => {
    console.log("first");
    try {
        const cropId = req.body.cropId;
        const extentha = req.body.extentha || "0";
        const extentac = req.body.extentac || "0";
        const extentp = req.body.extentp || "0";
        const startDate = req.body.startDate;
        const userId = req.user.id;
        const farmId = req.params.farmId;

        console.log("farmId", farmId);

        const { error } = enrollSchema.validate({
            extentha,
            extentac,
            extentp,
            startedAt: startDate,
            ongoingCultivationId: null,
            createdAt: undefined,
            farmId,
        });

        console.log("valide after");
        console.log("Error:", error);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        let cultivationId;
        const ongoingCultivationResult =
            await farmDao.checkOngoingCultivation(userId);

        if (!ongoingCultivationResult[0]) {
            const newCultivationResult =
                await farmDao.createOngoingCultivation(userId);
            cultivationId = newCultivationResult.insertId;
        } else {
            cultivationId = ongoingCultivationResult[0].id;
        }

        // Updated: Check crop count for specific farm
        const cropCountResult = await farmDao.checkCropCountByFarm(
            cultivationId,
            farmId,
        );
        const cropCount = cropCountResult[0].count;

        // Updated: Check enrolled crops for specific farm
        const enrolledCrops = await farmDao.checkEnrollCropByFarm(
            cultivationId,
            farmId,
        );
        if (enrolledCrops.some((crop) => crop.cropCalendar == cropId)) {
            return res.status(400).json({
                message: "You are already enrolled in this crop for this farm!",
            });
        }

        const cultivationIndex = cropCount + 1;

        await farmDao.enrollOngoingCultivationCrop(
            cultivationId,
            cropId,
            extentha,
            extentac,
            extentp,
            startDate,
            cultivationIndex,
            farmId,
        );
        const enroledoncultivationcrop =
            await farmDao.getEnrollOngoingCultivationCrop(cropId, userId, farmId);
        console.log("data", enroledoncultivationcrop);

        let onCulscropID;
        if (enroledoncultivationcrop.length > 0) {
            onCulscropID = enroledoncultivationcrop[0].id;
        } else {
            console.log("No records found for the given cultivationId.");
            return res
                .status(500)
                .json({ message: "Failed to create cultivation record" });
        }

        const responseenrollSlaveCrop = await farmDao.enrollSlaveCrop(
            userId,
            cropId,
            startDate,
            onCulscropID,
            farmId,
        );

        // UPDATED: Return the onCulscropID in the response
        return res.json({
            message: "Enrollment successful",
            ongoingCultivationCropId: onCulscropID,
            cultivationId: cultivationId,
            farmId: farmId,
        });
    } catch (err) {
        console.error("Error during enrollment:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

exports.phoneNumberChecker = asyncHandler(async (req, res) => {
    console.log("beforeeeeee");
    try {
        const { phoneNumber } = await signupCheckerSchema.validateAsync(req.body);
        const results = await farmDao.phoneNumberChecker(phoneNumber);
        console.log("checkkk", phoneNumber);
        // console.log("results from database:", results);

        let phoneNumberExists = false;

        const normalizedInputPhone = `+${String(phoneNumber).replace(/^\+/, "")}`;
        //  console.log("normalized input:", normalizedInputPhone);

        results.forEach((user) => {
            console.log("comparing with:", user.phoneNumber);
            if (user.phoneNumber === normalizedInputPhone) {
                phoneNumberExists = true;
            }
        });

        console.log("phoneNumberExists:", phoneNumberExists);

        if (phoneNumberExists) {
            return res.status(409).json({
                status: "error",
                message: "This phone number already exists.",
            });
        }

        res.status(200).json({
            status: "success",
            message: "Phone number is available!",
        });
    } catch (err) {
        console.error("Error in phoneNumberChecker:", err);
        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }
        res.status(500).json({
            status: "error",
            message: "Internal Server Error!",
        });
    }
});

exports.nicChecker = asyncHandler(async (req, res) => {
    console.log("beforeeeeee");
    try {
        const { nic } = await nicChecker.validateAsync(req.body);
        const results = await farmDao.nicChecker(nic);
        console.log("checkkk", nic);
        console.log("results from database:", results);

        let nicExists = false;

        const normalizedInputNic = String(nic).replace(/^\+/, "");
        console.log("normalized input:", normalizedInputNic);

        results.forEach((user) => {
            console.log("comparing with:", user.nic);
            if (user.nic === normalizedInputNic) {
                nicExists = true;
            }
        });

        console.log("nicExists:", nicExists);

        if (nicExists) {
            return res.status(409).json({
                status: "error",
                message: "This NIC already exists.",
            });
        }

        res.status(200).json({
            status: "success",
            message: "NIC is available!",
        });
    } catch (err) {
        console.error("Error in nicChecker:", err);
        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }
        res.status(500).json({
            status: "error",
            message: "Internal Server Error!",
        });
    }
});

///farmcount

exports.getCropCountByFarmId = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        const userId = req.user.id;

        const cropCount = await farmDao.getCropCountByFarmId(userId, farmId);

        if (cropCount === null || cropCount === undefined) {
            return res
                .status(404)
                .json({ message: "Farm not found or no crops found" });
        }

        res.status(200).json({ cropCount });
    } catch (error) {
        console.error("Error fetching crop count:", error);
        res.status(500).json({ message: "Failed to fetch crop count" });
    }
});

exports.UpdateFarm = asyncHandler(async (req, res) => {
    console.log("Farm update request:", req.body);

    try {
        const userId = req.user.id;
        const input = { ...req.body, userId };

        console.log("User ID:", userId);

        const { value, error } = updateFarm.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        console.log("Validated input:", value);

        const {
            farmId,
            farmName,
            farmIndex,
            farmImage,
            extentha,
            extentac,
            extentp,
            district,
            plotNo,
            street,
            city,
            staffCount,
        } = value;

        if (!farmId) {
            return res.status(400).json({
                status: "error",
                message: "farmId is required for updating a farm",
            });
        }

        const result = await farmDao.updateFarm({
            userId,
            farmId,
            farmName,
            farmImage,
            farmIndex,
            extentha,
            extentac,
            extentp,
            district,
            plotNo,
            street,
            city,
            staffCount,
        });

        console.log("Farm update result:", result);

        res.status(200).json({
            status: "success",
            message: "Farm updated successfully.",
            farmId: result.farmId,
            updatedRows: result.affectedRows,
        });
    } catch (err) {
        console.error("Error updating farm:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
});

exports.CreateNewStaffMember = asyncHandler(async (req, res) => {
    console.log("Staff member creation request:", req.body);
    try {
        const userId = req.user.id;
        const { farmId } = req.params;
        console.log("User ID:", userId, "Farm ID:", farmId);

        // Create input object for validation
        const input = {
            ...req.body,
            farmId,
        };

        // Validate input (you'll need to create/update your validation schema)
        const { value, error } = createStaffMember.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        console.log("Validated input:", value);

        const { firstName, lastName, phoneNumber, countryCode, role, nic } = value;

        // Create staff member
        const result = await farmDao.CreateStaffMember({
            userId,
            farmId,
            firstName,
            lastName,
            phoneNumber,
            countryCode,
            role,
            nic,
        });

        console.log("Staff member creation result:", result);

        res.status(201).json({
            status: "success",
            message: "Staff member created successfully.",
            staffId: result.staffId,
            data: result.data,
        });
    } catch (err) {
        console.error("Error creating staff member:", err);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
});

exports.getStaffMember = asyncHandler(async (req, res) => {
    console.log("fdgd");
    try {
        const { staffMemberId } = req.params;

        // Get staff member data
        const staffMemberData = await farmDao.getStaffMember(staffMemberId);

        if (!staffMemberData || staffMemberData.length === 0) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        // Return single staff member (first result)
        res.status(200).json(staffMemberData[0]);
    } catch (error) {
        console.error("Error fetching Staff member:", error);
        res.status(500).json({ message: "Failed to fetch staff member" });
    }
});

exports.updateStaffMember = asyncHandler(async (req, res) => {
    try {
        const { staffMemberId } = req.params;
        const { firstName, lastName, phoneNumber, countryCode, role, nic } =
            req.body;

        const result = await farmDao.updateStaffMember(staffMemberId, {
            firstName,
            lastName,
            phoneNumber,
            phoneCode: countryCode,
            role,
            nic,
        });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        res.status(200).json({ message: "Staff member updated successfully" });
    } catch (error) {
        console.error("Error updating staff member:", error);
        res.status(500).json({ message: "Failed to update staff member" });
    }
});

/////////////renew
exports.deleteStaffMember = asyncHandler(async (req, res) => {
    try {
        const { staffMemberId, farmId } = req.params;

        const result = await farmDao.deleteStaffMember(staffMemberId, farmId);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Staff member not found" });
        }

        res.status(200).json({ message: "Staff member deleted successfully" });
    } catch (error) {
        console.error("Error deleting staff member:", error);
        res.status(500).json({ message: "Failed to delete staff member" });
    }
});

exports.getrenew = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.ownerId;
        const farmData = await farmDao.getrenew(userId);

        if (!farmData) {
            return res.status(404).json({
                success: false,
                message: "Farm not found",
                needsRenewal: true,
            });
        }

        // Conditions for renewal
        const isExpired = new Date(farmData.expireDate) < new Date();
        const isInactive = farmData.activeStatus === 0;
        const isBlocked = farmData.isBlock === 1;

        const needsRenewal = isExpired || isInactive || isBlocked;

        res.status(200).json({
            success: true,
            data: {
                id: farmData.id,
                userId: farmData.userId,
                farmName: farmData.farmName,
                needsRenewal,
                status: needsRenewal ? "blocked" : "active",
                isBlock: farmData.isBlock,
                district: farmData.district,
                city: farmData.city,
                staffCount: farmData.staffCount,
                appUserCount: farmData.appUserCount,
                daysRemaining: farmData.daysRemaining,
                expireDate: farmData.expireDate,
                activeStatus: farmData.activeStatus,
            },
        });
    } catch (error) {
        console.error("Error fetching user farm:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user farm",
        });
    }
});

exports.deleteFarm = asyncHandler(async (req, res) => {
    console.log("Deleting farm...");
    console.log("Request params:", req.params);
    console.log("Req body:", req.body);

    try {
        const { farmId } = req.params;
        const ownerId = req.user.ownerId;

        console.log("Farm ID:", farmId);
        console.log("Owner ID:", ownerId);

        // Delete farm from database (this will also reorder farmIndex)
        const deleteResult = await farmDao.deleteFarm(farmId);

        if (!deleteResult) {
            return res.status(404).json({
                status: "error",
                message: "Farm not found or already deleted",
            });
        }

        // Delete S3 folder
        try {
            await delectfloders3(`plantcareuser/owner${ownerId}/farm${farmId}`);
        } catch (s3Error) {
            console.warn("S3 deletion warning:", s3Error);
            // Continue even if S3 deletion fails
        }

        res.status(200).json({
            status: "success",
            message: "Farm deleted successfully and farm indexes reordered",
        });
    } catch (err) {
        console.error("Error deleting farm:", err);

        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }

        res.status(500).json({
            status: "error",
            error: "Internal Server Error",
        });
    }
});

exports.getSelectFarm = asyncHandler(async (req, res) => {
    try {
        const ownerId = req.user.ownerId;
        const selectFarm = await farmDao.getSelectFarm(ownerId);

        console.log("Select Farm", selectFarm);

        // Return the farm data for dropdown
        return res.status(200).json({
            status: "success",
            message: "Farms retrieved successfully",
            data: selectFarm,
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
            message: "Error retrieving farms.",
        });
    }
});

////currect asset

exports.handleAddFixedAsset = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        const userId = req.user.ownerId;
        const staffId = req.user.id;
        const {
            category,
            asset,
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
        } = req.body;

        // Validate volume
        const volumeInt = parseInt(volume, 10);
        if (isNaN(volumeInt)) {
            return res.status(400).json({
                status: "error",
                message: "Volume must be a valid number.",
            });
        }

        // Format dates
        const formattedPurchaseDate = new Date(purchaseDate)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
        const formattedExpireDate = new Date(expireDate)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

        // Create new asset data
        const assetData = {
            userId: userId,
            staffId: staffId,
            farmId: farmId,
            category: category,
            asset: asset,
            brand: brand,
            batchNum: batchNum,
            unitVolume: volumeInt,
            unit: unit,
            numOfUnit: numberOfUnits,
            unitPrice: unitPrice,
            total: totalPrice,
            purchaseDate: formattedPurchaseDate,
            expireDate: formattedExpireDate,
            status: status,
        };

        const insertResult = await farmDao.createNewAsset(assetData);

        // Add record for new asset
        const recordData = {
            currentAssetId: insertResult.insertId,
            numOfPlusUnit: numberOfUnits,
            numOfMinUnit: 0,
            totalPrice: totalPrice,
        };

        await farmDao.addAssetRecord(recordData);

        res.status(201).json({
            status: "success",
            message: "New asset created successfully",
        });
    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Error adding fixed asset.",
        });
    }
});

exports.getAssetsByCategory = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.ownerId;
        const farmId = req.params.farmId;

        const { category } = await getAssetsByCategorySchema.validateAsync(
            req.query,
        );
        const assets = await farmDao.getAssetsByCategory(userId, category, farmId);

        console.log("hit----------", farmId, category, userId);

        console.log("assetssssssssss", assets);

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
    console.log("first");
    try {
        const userId = req.user.ownerId;
        const farmId = parseInt(req.params.farmId, 10);

        console.log(
            "userId:",
            userId,
            "farmId:",
            farmId,
            "farmId type:",
            typeof farmId,
        );

        const results = await farmDao.getAllCurrentAssets(userId, farmId);
        console.log("Results:", results);

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
        console.error("Error in getAllCurrentAssets:", err);
        res.status(500).json({
            status: "error",
            message: `An error occurred: ${err.message}`,
        });
    }
});

exports.getFixedAssetsByCategory = asyncHandler(async (req, res) => {
    console.log("///////////////////");
    try {
        const userId = req.user.ownerId;
        const { category, farmId } = req.params;

        const results = await farmDao.getFixedAssetsByCategory(
            userId,
            category,
            farmId,
        );

        if (results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No fixed assets found for this category",
            });
        }

        return res.status(200).json({
            status: "success",
            fixedAssets: results,
        });
    } catch (err) {
        if (err.message === "Invalid category provided.") {
            return res.status(400).json({
                status: "error",
                message: err.message,
            });
        }

        res.status(500).json({
            status: "error",
            message: `An error occurred: ${err.message}`,
        });
    }
});

exports.getFarmName = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.ownerId;
        const farmId = req.params.farmId;

        console.log("Fetching farm for userId:", userId, "farmId:", farmId);

        const farms = await farmDao.getFarmName(userId, farmId);
        console.log("farms", farms);

        if (!farms || farms.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No farm found",
                data: null,
            });
        }

        res.status(200).json({
            status: "success",
            message: "Farm retrieved successfully",
            data: farms[0],
        });
    } catch (error) {
        console.error("Error fetching farm:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch farm",
            data: null,
        });
    }
});

/////delete

exports.deleteAsset = (req, res) => {
    const { category, assetId } = req.params;
    const { numberOfUnits, totalPrice } = req.body;
    const userId = req.user.ownerId;

    // Validate input
    if (!numberOfUnits || numberOfUnits <= 0) {
        return res.status(400).json({ message: "Invalid number of units." });
    }

    if (!totalPrice || totalPrice <= 0) {
        return res.status(400).json({ message: "Invalid total price." });
    }

    db.plantcare.execute(
        "SELECT * FROM currentasset WHERE userId = ? AND category = ? AND id = ?",
        [userId, category, assetId],
        (err, results) => {
            if (err) {
                console.error("Error retrieving asset:", err);
                return res.status(500).json({ message: "Server error." });
            }

            if (!results.length) {
                return res.status(404).json({ message: "Asset not found." });
            }

            const currentAsset = results[0];
            const newNumOfUnit = currentAsset.numOfUnit - numberOfUnits;
            const newTotal = currentAsset.total - totalPrice;

            // Validation checks
            if (numberOfUnits > currentAsset.numOfUnit) {
                return res
                    .status(400)
                    .json({ message: "Cannot remove more units than available." });
            }

            if (totalPrice > currentAsset.total) {
                return res
                    .status(400)
                    .json({ message: "Cannot remove more value than available." });
            }

            if (newNumOfUnit < 0 || newTotal < 0) {
                return res
                    .status(400)
                    .json({ message: "Invalid operation: insufficient units or value." });
            }

            // FIRST: Insert the record while the asset still exists
            db.plantcare.execute(
                "INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice) VALUES (?, 0, ?, ?)",
                [currentAsset.id, numberOfUnits, totalPrice],
                (recordErr) => {
                    if (recordErr) {
                        console.error("Error adding asset record:", recordErr);
                        return res
                            .status(500)
                            .json({ message: "Failed to record transaction." });
                    }

                    if (newNumOfUnit === 0 && newTotal === 0) {
                        // Delete the entire asset
                        db.plantcare.execute(
                            "DELETE FROM currentasset WHERE userId = ? AND category = ? AND id = ?",
                            [userId, category, assetId],
                            (deleteErr) => {
                                if (deleteErr) {
                                    console.error("Error deleting asset:", deleteErr);
                                    return res
                                        .status(500)
                                        .json({ message: "Failed to delete asset." });
                                }

                                res
                                    .status(200)
                                    .json({ message: "Asset removed successfully." });
                            },
                        );
                    } else {
                        // Update the asset with new values
                        db.plantcare.execute(
                            "UPDATE currentasset SET numOfUnit = ?, total = ? WHERE userId = ? AND category = ? AND id = ?",
                            [newNumOfUnit, newTotal, userId, category, assetId],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error("Error updating asset:", updateErr);
                                    return res
                                        .status(500)
                                        .json({ message: "Failed to update asset." });
                                }

                                res
                                    .status(200)
                                    .json({ message: "Asset updated successfully." });
                            },
                        );
                    }
                },
            );
        },
    );
};

exports.updateCurrentAsset = asyncHandler(async (req, res) => {
    try {
        const assetId = req.params.assetId;
        const userId = req.user.ownerId;
        const staffId = req.user.id;
        const { numberOfUnits, unitPrice, totalPrice } = req.body;

        // If numberOfUnits is 0, delete the asset
        if (numberOfUnits === 0 || numberOfUnits === "0") {
            const result = await farmDao.deleteCurrentAsset(assetId);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: "error",
                    message: "Asset not found",
                });
            }

            return res.status(200).json({
                status: "success",
                message: "Asset deleted successfully",
            });
        }

        // Otherwise, update the asset
        const assetData = {
            userId: userId,
            staffId: staffId,
            numOfUnit: numberOfUnits,
            unitPrice: unitPrice,
            total: totalPrice,
        };

        const result = await farmDao.updateCurrentAsset(assetId, assetData);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Asset not found",
            });
        }

        res.status(200).json({
            status: "success",
            message: "Asset updated successfully",
        });
    } catch (error) {
        console.error("Error updating current asset:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to update asset",
        });
    }
});

exports.getFarmExtend = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        console.log("Fetching farm extent for farmId:", farmId);

        const farms = await farmDao.getFarmExtend(farmId);
        console.log("farms", farms);

        if (!farms || farms.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No farm found",
                data: null,
            });
        }

        const farmData = farms[0];

        // Format response with clear extent information
        const response = {
            id: farmData.id,
            farmName: farmData.farmName,
            totalExtent: {
                hectares: farmData.extentha,
                acres: farmData.extentac,
                perches: farmData.extentp,
                totalPerches: farmData.totalExtentPerches,
            },
            cultivatedExtent: {
                hectares: farmData.cultivatedExtentha,
                acres: farmData.cultivatedExtentac,
                perches: farmData.cultivatedExtentp,
                totalPerches: farmData.cultivatedExtentPerches,
            },
            availableExtent: {
                hectares: farmData.availableExtentha,
                acres: farmData.availableExtentac,
                perches: farmData.availableExtentp,
                totalPerches: farmData.availableExtentPerches,
            },
        };

        res.status(200).json({
            status: "success",
            message: "Farm extent retrieved successfully",
            data: response,
        });
    } catch (error) {
        console.error("Error fetching farm extent:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch farm extent",
            data: null,
        });
    }
});

exports.getCurrectAssetAlredayHave = asyncHandler(async (req, res) => {
    console.log("Getting already added assets");
    try {
        const farmId = parseInt(req.params.farmId, 10);

        if (isNaN(farmId)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid farmId",
            });
        }

        const results = await farmDao.getCurrectAssetAlredayHave(farmId);
        console.log("Results:", results);

        if (results.length === 0) {
            return res.status(200).json({
                status: "success",
                message: "No assets found for this farm",
                currentAssetsByCategory: [],
            });
        }

        return res.status(200).json({
            status: "success",
            currentAssetsByCategory: results,
        });
    } catch (err) {
        console.error("Error in getCurrectAssetAlredayHave:", err);
        res.status(500).json({
            status: "error",
            message: `An error occurred: ${err.message}`,
        });
    }
});

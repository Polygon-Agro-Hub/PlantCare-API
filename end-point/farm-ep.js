const asyncHandler = require("express-async-handler");
const farmDao = require("../dao/farm-dao");
const { createFarm, createPayment, signupCheckerSchema, updateFarm, createStaffMember, getSlaveCropCalendarDaysSchema } = require('../validations/farm-validation');
const delectfilesOnS3 = require('../Middlewares/s3delete');
const delectfloders3 = require('../Middlewares/s3folderdelete')
const db = require("../startup/database");


const {

    ongoingCultivationSchema,
    enrollSchema,

} = require("../validations/farm-validation");

exports.CreateFarm = asyncHandler(async (req, res) => {
    console.log('Farm creation request:', req.body);

    try {
        const userId = req.user.id;
        const input = { ...req.body, userId };

        console.log('User ID:', userId);

        // Validate input
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
            staff // Array of staff objects
        } = value;

        // Create farm and staff in a transaction
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
            staff
        });

        console.log("Farm creation result:", result);

        res.status(201).json({
            status: "success",
            message: "Farm and staff created successfully.",
            farmId: result.farmId,
            staffIds: result.staffIds,
            totalStaffCreated: result.staffIds.length
        });

    } catch (err) {
        console.error("Error creating farm:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.getFarms = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farms = await farmDao.getAllFarmByUserId(userId);
        console.log("far,ss", farms)

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

        // Get farm data with staff
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
            data: userMembership
        });
    } catch (error) {
        console.error("Error fetching user membership:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user membership"
        });
    }
});


exports.CreatePayment = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const input = { ...req.body, userId };

        console.log('Payment request data:', input);

        // Validate input using Joi schema
        const { value, error } = createPayment.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        const { payment, plan, expireDate } = value;

        // Create payment and update user membership
        const result = await farmDao.createPaymentAndUpdateMembership({
            userId,
            payment,
            plan,
            expireDate
        });

        res.status(201).json({
            status: "success",
            message: "Payment processed and membership updated successfully.",
            paymentId: result.paymentId,
            userUpdated: result.userUpdated
        });

    } catch (err) {
        console.error("Error processing payment:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


//////////////cultivation


exports.OngoingCultivaionGetById = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farmId = req.params.farmId; // Get farmId from route parameter

        // Validate farmId
        if (!farmId) {
            return res.status(400).json({
                status: "error",
                message: "Farm ID is required",
            });
        }

        // Validate farmId is a number (if needed)
        if (isNaN(farmId)) {
            return res.status(400).json({
                status: "error",
                message: "Farm ID must be a valid number",
            });
        }

        farmDao.getOngoingCultivationsByUserIdAndFarmId(userId, farmId, (err, results) => {
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
        });
    } catch (err) {
        console.error("Error in OngoingCultivationGetById:", err);
        res
            .status(500)
            .json({ status: "error", message: "Internal Server Error!" });
    }
});


// ENDPOINT - Updated to include farmId validation and usage
exports.enroll = asyncHandler(async (req, res) => {
    console.log("first")
    try {
        const cropId = req.body.cropId;
        const extentha = req.body.extentha || '0';
        const extentac = req.body.extentac || '0';
        const extentp = req.body.extentp || '0';
        const startDate = req.body.startDate;
        const userId = req.user.id;
        const farmId = req.params.farmId

        console.log("farmId", farmId)

        const { error } = enrollSchema.validate({
            extentha,
            extentac,
            extentp,
            startedAt: startDate,
            ongoingCultivationId: null,
            createdAt: undefined,
            farmId
        });

        console.log("valide after")
        console.log("Error:", error);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        let cultivationId;
        const ongoingCultivationResult = await farmDao.checkOngoingCultivation(userId);

        if (!ongoingCultivationResult[0]) {
            const newCultivationResult = await farmDao.createOngoingCultivation(userId);
            cultivationId = newCultivationResult.insertId;
        } else {
            cultivationId = ongoingCultivationResult[0].id;
        }

        // Updated: Check crop count for specific farm
        const cropCountResult = await farmDao.checkCropCountByFarm(cultivationId, farmId);
        const cropCount = cropCountResult[0].count;

        // if (cropCount >= 3) {
        //     return res
        //         .status(400)
        //         .json({ message: "You have already enrolled in 3 crops for this farm" });
        // }

        // Updated: Check enrolled crops for specific farm
        const enrolledCrops = await farmDao.checkEnrollCropByFarm(cultivationId, farmId);
        if (enrolledCrops.some((crop) => crop.cropCalendar == cropId)) {
            return res
                .status(400)
                .json({ message: "You are already enrolled in this crop for this farm!" });
        }

        const cultivationIndex = cropCount + 1;

        await farmDao.enrollOngoingCultivationCrop(cultivationId, cropId, extentha, extentac, extentp, startDate, cultivationIndex, farmId);
        const enroledoncultivationcrop = await farmDao.getEnrollOngoingCultivationCrop(cropId, userId, farmId);
        console.log("data", enroledoncultivationcrop);

        let onCulscropID;
        if (enroledoncultivationcrop.length > 0) {
            onCulscropID = enroledoncultivationcrop[0].id;
        } else {
            console.log("No records found for the given cultivationId.");
            return res.status(500).json({ message: "Failed to create cultivation record" });
        }

        const responseenrollSlaveCrop = await farmDao.enrollSlaveCrop(userId, cropId, startDate, onCulscropID, farmId);

        return res.json({ message: "Enrollment successful" });
    } catch (err) {
        console.error("Error during enrollment:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



// ENDPOINT
exports.phoneNumberChecker = asyncHandler(async (req, res) => {
    console.log("beforeeeeee")
    try {
        const { phoneNumber } = await signupCheckerSchema.validateAsync(req.body);
        const results = await farmDao.phoneNumberChecker(phoneNumber);
        console.log("checkkk", phoneNumber)
        console.log("results from database:", results); // Add this debug log

        let phoneNumberExists = false;

        // Normalize the input phone number for comparison
        const normalizedInputPhone = `+${String(phoneNumber).replace(/^\+/, "")}`;
        console.log("normalized input:", normalizedInputPhone); // Add this debug log

        results.forEach((user) => {
            console.log("comparing with:", user.phoneNumber); // Add this debug log
            if (user.phoneNumber === normalizedInputPhone) {
                phoneNumberExists = true;
            }
        });

        console.log("phoneNumberExists:", phoneNumberExists); // Add this debug log

        if (phoneNumberExists) {
            return res.status(409).json({
                status: "error",
                message: "This phone number already exists."
            });
        }

        // Phone number is available
        res.status(200).json({
            status: "success",
            message: "Phone number is available!"
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
            message: "Internal Server Error!"
        });
    }
});



///farmcount

exports.getCropCountByFarmId = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId; // Changed from req.params.id to req.params.farmId
        const userId = req.user.id;

        // Get crop count - parameters are now in correct order
        const cropCount = await farmDao.getCropCountByFarmId(userId, farmId);

        if (cropCount === null || cropCount === undefined) {
            return res.status(404).json({ message: "Farm not found or no crops found" });
        }

        res.status(200).json({ cropCount }); // Return as object for consistency
    } catch (error) {
        console.error("Error fetching crop count:", error);
        res.status(500).json({ message: "Failed to fetch crop count" });
    }
});



exports.UpdateFarm = asyncHandler(async (req, res) => {
    console.log('Farm update request:', req.body);

    try {
        const userId = req.user.id;
        const input = { ...req.body, userId };

        console.log('User ID:', userId);

        // Validate input - you might want to create a separate validation schema for updates
        const { value, error } = updateFarm.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        console.log("Validated input:", value);

        const {
            farmId, // This should be provided to identify which farm to update
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
            staffCount
        } = value;

        // Check if farmId is provided
        if (!farmId) {
            return res.status(400).json({
                status: "error",
                message: "farmId is required for updating a farm",
            });
        }

        // Update farm
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
            staffCount
        });

        console.log("Farm update result:", result);

        res.status(200).json({
            status: "success",
            message: "Farm updated successfully.",
            farmId: result.farmId,
            updatedRows: result.affectedRows
        });

    } catch (err) {
        console.error("Error updating farm:", err);

        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});



// exports.CreateNewStaffMember = asyncHandler(async (req, res) => {
//     console.log('Staff member creation request:', req.body);
//     try {
//         const userId = req.user.id;
//         const { farmId } = req.params; // Get farmId from URL params
//         console.log('User ID:', userId, 'Farm ID:', farmId);

//         // Create input object for validation
//         const input = {
//             ...req.body,
//             farmId // Include farmId in input for validation
//         };

//         // Validate input (you'll need to create/update your validation schema)
//         const { value, error } = createStaffMember.validate(input); // Note: changed from createFarm
//         if (error) {
//             return res.status(400).json({
//                 status: "error",
//                 message: error.details[0].message,
//             });
//         }

//         console.log("Validated input:", value);

//         const {
//             firstName,
//             lastName,
//             phoneNumber,
//             countryCode,
//             role
//         } = value;

//         // Create staff member
//         const result = await farmDao.CreateStaffMember({
//             userId,
//             farmId,
//             firstName,
//             lastName,
//             phoneNumber,
//             countryCode,
//             role
//         });

//         console.log("Staff member creation result:", result);

//         res.status(201).json({
//             status: "success",
//             message: "Staff member created successfully.",
//             staffId: result.staffId,
//             data: result.data
//         });

//     } catch (err) {
//         console.error("Error creating staff member:", err);
//         res.status(500).json({
//             status: "error",
//             message: "Internal Server Error",
//             error: process.env.NODE_ENV === 'development' ? err.message : undefined
//         });
//     }
// });

exports.CreateNewStaffMember = asyncHandler(async (req, res) => {
    console.log('Staff member creation request:', req.body);
    try {
        const userId = req.user.id;
        const { farmId } = req.params; // Get farmId from URL params
        console.log('User ID:', userId, 'Farm ID:', farmId);

        // Create input object for validation
        const input = {
            ...req.body,
            farmId // Include farmId in input for validation
        };

        // Validate input (you'll need to create/update your validation schema)
        const { value, error } = createStaffMember.validate(input); // Note: changed from createFarm
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        console.log("Validated input:", value);

        const {
            firstName,
            lastName,
            phoneNumber,
            countryCode,
            role
        } = value;

        // Create staff member
        const result = await farmDao.CreateStaffMember({
            userId,
            farmId,
            firstName,
            lastName,
            phoneNumber,
            countryCode,
            role
        });

        console.log("Staff member creation result:", result);

        res.status(201).json({
            status: "success",
            message: "Staff member created successfully.",
            staffId: result.staffId,
            data: result.data
        });

    } catch (err) {
        console.error("Error creating staff member:", err);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


exports.getStaffMember = asyncHandler(async (req, res) => {
    try {
        const { staffMemberId } = req.params; // Fixed: destructure to get the actual value

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
        const { firstName, lastName, phoneNumber, countryCode, role } = req.body;

        const result = await farmDao.updateStaffMember(staffMemberId, {
            firstName,
            lastName,
            phoneNumber,
            phoneCode: countryCode,
            role
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

// exports.getrenew = asyncHandler(async (req, res) => {
//     try {
//         const userId = req.user.ownerId;
//         const membershipData = await farmDao.getrenew(userId);

//         if (!membershipData) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Membership not found",
//                 needsRenewal: true
//             });
//         }

//         // Check if renewal is needed based on expireDate
//         const currentDate = new Date();
//         const expireDate = new Date(membershipData.expireDate);
//         const needsRenewal = currentDate > expireDate;

//         res.status(200).json({
//             success: true,
//             data: {
//                 id: membershipData.id,
//                 userId: membershipData.userId,
//                 expireDate: membershipData.expireDate,
//                 needsRenewal: needsRenewal,
//                 status: needsRenewal ? 'expired' : 'active',
//                 daysRemaining: needsRenewal ? 0 : Math.ceil((expireDate - currentDate) / (1000 * 60 * 60 * 24))
//             }
//         });
//     } catch (error) {
//         console.error("Error fetching user membership:", error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch user membership"
//         });
//     }
// });


exports.getrenew = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.ownerId;
        const farmData = await farmDao.getrenew(userId);

        if (!farmData) {
            return res.status(404).json({
                success: false,
                message: "Farm not found",
                needsRenewal: true
            });
        }

        // Check renewal status based on isBlock field
        // isBlock = 0 means active, isBlock = 1 means needs renewal
        const needsRenewal = farmData.isBlock === 1;

        res.status(200).json({
            success: true,
            data: {
                id: farmData.id,
                userId: farmData.userId,
                farmName: farmData.farmName,
                needsRenewal: needsRenewal,
                status: needsRenewal ? 'blocked' : 'active',
                isBlock: farmData.isBlock,
                district: farmData.district,
                city: farmData.city,
                staffCount: farmData.staffCount,
                appUserCount: farmData.appUserCount
            }
        });

    } catch (error) {
        console.error("Error fetching user farm:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user farm"
        });
    }
});

// exports.deleteFarm = asyncHandler(async (req, res) => {
//     console.log("Deleting farm...");
//     console.log("Request params:", req.params);
//     console.log("Req body:", req.body);

//     try {
//         const { farmId } = req.params; // Fixed: removed .farmId
//         const ownerId = req.user.ownerId;

//         console.log("Farm ID:", farmId);
//         console.log("Owner ID:", ownerId);

//         // Delete farm from database
//         const deleteResult = await farmDao.deleteFarm(farmId);

//         if (!deleteResult) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "Farm not found or already deleted"
//             });
//         }

//         // Delete S3 folder
//         await delectfloders3(`plantcareuser/owner${ownerId}/farm${farmId}`);

//         res.status(200).json({
//             status: "success",
//             message: "Farm deleted successfully"
//         });

//     } catch (err) {
//         console.error("Error deleting farm:", err);

//         if (err.isJoi) {
//             return res.status(400).json({
//                 status: "error",
//                 message: err.details[0].message,
//             });
//         }

//         res.status(500).json({
//             status: "error",
//             error: "Internal Server Error"
//         });
//     }
// });

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
                message: "Farm not found or already deleted"
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
            message: "Farm deleted successfully and farm indexes reordered"
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
            error: "Internal Server Error"
        });
    }
});

exports.getSelectFarm = asyncHandler(async (req, res) => {
    try {
        const ownerId = req.user.ownerId;
        const selectFarm = await farmDao.getSelectFarm(ownerId);

        console.log('Select Farm', selectFarm);

        // Return the farm data for dropdown
        return res.status(200).json({
            status: "success",
            message: "Farms retrieved successfully",
            data: selectFarm
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

// exports.handleAddFixedAsset = (req, res) => {

//     const farmId = req.params;

//     const userId = req.user.id;
//     const {
//         category,
//         asset,

//         brand,
//         batchNum,
//         volume,
//         unit,
//         numberOfUnits,
//         unitPrice,
//         totalPrice,
//         purchaseDate,
//         expireDate,
//         warranty,
//         status
//     } = req.body;

//     const volumeInt = parseInt(volume, 10);
//     if (isNaN(volumeInt)) {
//         return res.status(400).json({ status: 'error', message: 'Volume must be a valid number.' });
//     }

//     const formattedPurchaseDate = new Date(purchaseDate).toISOString().slice(0, 19).replace('T', ' ');
//     const formattedExpireDate = new Date(expireDate).toISOString().slice(0, 19).replace('T', ' ');

//     const checkSql = `SELECT * FROM currentasset WHERE userId = ? AND category = ? AND asset = ? AND brand = ? AND batchNum = ?`;

//     db.plantcare.query(checkSql, [userId, category, asset, brand, batchNum], (err, results) => {

//         if (err) {
//             console.error('Error checking asset:', err);
//             return res.status(500).json({ status: 'error', message: 'Error checking asset: ' + err.message });
//         }

//         if (results.length > 0) {
//             const existingAsset = results[0];

//             const updatedNumOfUnits = parseFloat(existingAsset.numOfUnit) + parseFloat(numberOfUnits);
//             const updatedTotalPrice = (parseFloat(existingAsset.total) + parseFloat(totalPrice)).toFixed(2);

//             const updateSql = `
//                 UPDATE currentasset
//                 SET numOfUnit = ?, total = ?, unitVolume = ?, unitPrice = ?, purchaseDate = ?, expireDate = ?, status = ?
//                 WHERE id = ?
//             `;
//             const updateValues = [
//                 updatedNumOfUnits.toFixed(2),
//                 updatedTotalPrice,
//                 volumeInt,
//                 unitPrice,
//                 formattedPurchaseDate,
//                 formattedExpireDate,
//                 status,
//                 existingAsset.id
//             ];

//             db.plantcare.query(updateSql, updateValues, (updateErr, updateResult) => {
//                 if (updateErr) {
//                     console.error('Error updating asset:', updateErr);
//                     return res.status(500).json({
//                         status: 'error',
//                         message: 'Error updating asset: ' + updateErr.message,
//                     });
//                 }

//                 if (updateResult.affectedRows === 0) {
//                     console.log('No rows were updated');
//                     return res.status(500).json({
//                         status: 'error',
//                         message: 'No asset was updated. Please check if the asset exists.',
//                     });
//                 }

//                 const recordSql = `
//                     INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
//                     VALUES (?, ?, 0, ?)
//                 `;
//                 const recordValues = [existingAsset.id, numberOfUnits, totalPrice];

//                 db.plantcare.query(recordSql, recordValues, (recordErr) => {
//                     if (recordErr) {
//                         console.error('Error adding asset record:', recordErr);
//                         return res.status(500).json({
//                             status: 'error',
//                             message: 'Error adding asset record: ' + recordErr.message,
//                         });
//                     }

//                     res.status(200).json({
//                         status: 'success',
//                         message: 'Asset updated successfully',
//                     });
//                 });
//             });

//         } else {

//             const insertSql = `
//                 INSERT INTO currentasset (userId,farmId, category, asset, brand, batchNum, unitVolume, unit, numOfUnit, unitPrice, total, purchaseDate, expireDate, status)
//                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
//             `;
//             const insertValues = [
//                 userId, farmId, category, asset, brand, batchNum, volumeInt, unit,
//                 numberOfUnits, unitPrice, totalPrice, formattedPurchaseDate, formattedExpireDate, status
//             ];

//             db.plantcare.query(insertSql, insertValues, (insertErr, insertResult) => {
//                 if (insertErr) {
//                     console.error('Error inserting new asset:', insertErr);
//                     return res.status(500).json({
//                         status: 'error',
//                         message: 'Error inserting new asset: ' + insertErr.message,
//                     });
//                 }

//                 const newRecordSql = `
//                     INSERT INTO currentassetrecord (currentAssetId, numOfPlusUnit, numOfMinUnit, totalPrice)
//                     VALUES (?, ?, 0, ?)
//                 `;
//                 const newRecordValues = [insertResult.insertId, numberOfUnits, totalPrice];

//                 db.plantcare.query(newRecordSql, newRecordValues, (newRecordErr) => {
//                     if (newRecordErr) {
//                         console.error('Error adding new asset record:', newRecordErr);
//                         return res.status(500).json({
//                             status: 'error',
//                             message: 'Error adding new asset record: ' + newRecordErr.message,
//                         });
//                     }

//                     res.status(201).json({
//                         status: 'success',
//                         message: 'New asset created successfully',
//                     });
//                 });
//             });
//         }
//     });
// };

exports.handleAddFixedAsset = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        const userId = req.user.id;
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
            status
        } = req.body;

        // Validate volume
        const volumeInt = parseInt(volume, 10);
        if (isNaN(volumeInt)) {
            return res.status(400).json({
                status: 'error',
                message: 'Volume must be a valid number.'
            });
        }

        // Format dates
        const formattedPurchaseDate = new Date(purchaseDate).toISOString().slice(0, 19).replace('T', ' ');
        const formattedExpireDate = new Date(expireDate).toISOString().slice(0, 19).replace('T', ' ');

        // Create new asset data
        const assetData = {
            userId: userId,
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
            status: status
        };

        const insertResult = await farmDao.createNewAsset(assetData);

        // Add record for new asset
        const recordData = {
            currentAssetId: insertResult.insertId,
            numOfPlusUnit: numberOfUnits,
            numOfMinUnit: 0,
            totalPrice: totalPrice
        };

        await farmDao.addAssetRecord(recordData);

        res.status(201).json({
            status: 'success',
            message: 'New asset created successfully',
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
        const userId = req.user.id;
        const farmId = req.params.farmId;

        const { category } = await getAssetsByCategorySchema.validateAsync(
            req.query
        );
        const assets = await farmDao.getAssetsByCategory(userId, category, farmId);

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

        const userId = req.user.id;
        const farmId = req.params.farmId;

        const results = await farmDao.getAllCurrentAssets(userId, farmId);

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


exports.getFixedAssetsByCategory = asyncHandler(async (req, res) => {
    console.log("///////////////////")
    try {
        const userId = req.user.id;
        const { category, farmId } = req.params;



        const results = await farmDao.getFixedAssetsByCategory(userId, category, farmId);

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
        if (err.message === 'Invalid category provided.') {
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
        const userId = req.user.id;
        const farmId = req.params.farmId;

        console.log("Fetching farm for userId:", userId, "farmId:", farmId);

        const farms = await farmDao.getFarmName(userId, farmId);
        console.log("farms", farms);

        if (!farms || farms.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No farm found",
                data: null
            });
        }

        // Return consistent response format
        res.status(200).json({
            status: "success",
            message: "Farm retrieved successfully",
            data: farms[0] // Return single farm object since we're querying by specific farmId
        });
    } catch (error) {
        console.error("Error fetching farm:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch farm",
            data: null
        });
    }
});
const asyncHandler = require("express-async-handler");
const delectfilesOnS3 = require('../Middlewares/s3delete')

const cropDao = require("../dao/userCrop-dao");

const {
    getCropByCategorySchema,
    getCropByIdSchema,
    cropCalendarFeedSchema,
    ongoingCultivationSchema,
    enrollSchema,
    getSlaveCropCalendarDaysSchema,
    updateCropCalendarStatusSchema
} = require("../validations/userCrop-validation");

exports.getCropByCategory = asyncHandler(async (req, res) => {
    try {
        const { error } = getCropByCategorySchema.validate(req.params);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        const { categorie } = req.params;

        const crops = await cropDao.getCropByCategory(categorie);

        res.status(200).json(crops);
    } catch (err) {
        console.error("Error fetching crops by category:", err);
        res.status(500).json({
            status: "error",
            message: "An error occurred while fetching crops by category.",
        });
    }
});

exports.getCropByDistrict = asyncHandler(async (req, res) => {
    try {

        const { categorie, district } = req.params;

        const crops = await cropDao.getCropByDistrict(categorie, district);

        res.status(200).json(crops);
    } catch (err) {
        console.error("Error fetching crops by category:", err);
        res.status(500).json({
            status: "error",
            message: "An error occurred while fetching crops by category.",
        });
    }
});

exports.getCropVariety = asyncHandler(async (req, res) => {
    try {
        await getCropByIdSchema.validateAsync(req.params);

        const cropId = req.params.id;

        const results = await cropDao.getCropVariety(cropId);

        if (results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Crop not found",
            });
        }

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching crop details:", err);
        res.status(500).json({ message: "Internal Server Error !" });
    }
});

exports.getCropCalenderDetails = asyncHandler(async (req, res) => {
    try {


        const id = req.params.id;
        const method = req.params.method;
        const naofcul = req.params.naofcul;

        const results = await cropDao.getCropCalenderDetails(id, method, naofcul);

        if (results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Crop variety not found",
            });
        }

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching crop variety details:", err);
        res.status(500).json({ message: "Internal Server Error !" });
    }
});


exports.CropCalanderFeed = asyncHandler(async (req, res) => {
    try {
        const { error } = cropCalendarFeedSchema.validate(req.params);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        const userId = req.user.ownerId;
        const cropId = req.params.cropid;

        const results = await cropDao.getCropCalendarFeed(userId, cropId);

        if (!results || results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No data found for the given crop ID and user",
            });
        }

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching crop calendar feed:", err);
        res.status(500).json({
            status: "error",
            message: "An error occurred while fetching the crop calendar feed.",
        });
    }
});

exports.OngoingCultivaionGetById = asyncHandler(async (req, res) => {
    try {
        const { error, value } = ongoingCultivationSchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        const ownerId = req.user.ownerId;
        const farmId = req.user.farmId;
        console.log("farm and usrid", farmId, ownerId)

        cropDao.getOngoingCultivationsByUserId(ownerId, farmId, (err, results) => {
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
                    message: "No ongoing cultivation found for this user",
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

///

exports.enroll = asyncHandler(async (req, res) => {
    try {
        const cropId = req.body.cropId;
        const extentha = req.body.extentha || '0';
        const extentac = req.body.extentac || '0';
        const extentp = req.body.extentp || '0';
        const startDate = req.body.startDate;
        const userId = req.user.ownerId;

        const { error } = enrollSchema.validate({
            extentha,
            extentac,
            extentp,
            startedAt: startDate,
            ongoingCultivationId: null,
            createdAt: undefined,
        });

        console.log("Error:", error);

        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        let cultivationId;
        const ongoingCultivationResult = await cropDao.checkOngoingCultivation(userId);

        if (!ongoingCultivationResult[0]) {
            const newCultivationResult = await cropDao.createOngoingCultivation(userId);
            cultivationId = newCultivationResult.insertId;
        } else {
            cultivationId = ongoingCultivationResult[0].id;
        }

        const cropCountResult = await cropDao.checkCropCount(cultivationId);
        const cropCount = cropCountResult[0].count;

        if (cropCount >= 3) {
            return res
                .status(400)
                .json({ message: "You have already enrolled in 3 crops" });
        }

        const enrolledCrops = await cropDao.checkEnrollCrop(cultivationId);
        if (enrolledCrops.some((crop) => crop.cropCalendar == cropId)) {
            return res
                .status(400)
                .json({ message: "You are already enrolled in this crop!" });
        }

        const cultivationIndex = cropCount + 1;

        await cropDao.enrollOngoingCultivationCrop(cultivationId, cropId, extentha, extentac, extentp, startDate, cultivationIndex);
        const enroledoncultivationcrop = await cropDao.getEnrollOngoingCultivationCrop(cropId, userId);
        console.log("data", res)
        let onCulscropID;
        if (enroledoncultivationcrop.length > 0) {
            onCulscropID = enroledoncultivationcrop[0].id;
        } else {
            console.log("No records found for the given cultivationId.");
        }


        const responseenrollSlaveCrop = await cropDao.enrollSlaveCrop(userId, cropId, startDate, onCulscropID);

        return res.json({ message: "Enrollment successful" });
    } catch (err) {
        console.error("Error during enrollment:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

exports.getOngoingCultivationCropByid = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id;
        const results = await cropDao.getEnrollOngoingCultivationCropByid(id);

        if (results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Crop variety not found",
            });
        }

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching crop variety details:", err);
        res.status(500).json({ message: "Internal Server Error !" });
    }
});




exports.UpdateOngoingCultivationScrops = asyncHandler(async (req, res) => {
    try {
        const { extentha, extentac, extentp, onCulscropID } = req.body;

        if (!extentha || !extentac || !extentp) {
            return res.status(400).json({ message: "Extent and Start Date are required." });
        }

        const results = await cropDao.updateOngoingCultivationCrop(onCulscropID, extentha, extentac, extentp);

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Ongoing cultivation crop not found or not updated." });
        }
        res.status(200).json({ message: "Ongoing cultivation crop and slavecropcalendardays updated successfully.", results });
    } catch (err) {
        console.error("Error updating ongoing cultivation crop:", err);
        res.status(500).json({ message: "Server error. Unable to update ongoing cultivation crop." });
    }
});



exports.getSlaveCropCalendarDaysByUserAndCrop = asyncHandler(async (req, res) => {
    try {
        // Debug: Log all parameters
        console.log("DEBUG: req.params:", req.params);
        console.log("DEBUG: req.query:", req.query);
        console.log("DEBUG: Route parameters received:");
        console.log("  - cropCalendarId:", req.params.cropCalendarId);
        console.log("  - farmId:", req.params.farmId);

        // Validate parameters
        await getSlaveCropCalendarDaysSchema.validateAsync(req.params);

        const userId = req.user.ownerId;
        const cropCalendarId = req.params.cropCalendarId;
        const farmId = req.params.farmId;

        console.log("DEBUG: Validated parameters:");
        console.log("  - userId:", userId);
        console.log("  - cropCalendarId:", cropCalendarId);
        console.log("  - farmId:", farmId);

        const results = await cropDao.getSlaveCropCalendarDaysByUserAndCrop(userId, cropCalendarId, farmId);

        if (results.length === 0) {
            return res.status(404).json({
                message: "No records found for the given userId, cropCalendarId, and farmId.",
            });
        }

        console.log("DEBUG: Results found:", results.length);
        return res.status(200).json(results);

    } catch (err) {
        console.error("Error in getSlaveCropCalendarDaysByUserAndCrop:", err);

        if (err.isJoi) {
            console.log("DEBUG: Validation error details:", err.details);
            return res.status(400).json({
                status: 'error',
                message: err.details[0].message,
                received_params: req.params
            });
        }

        return res.status(500).json({ message: "Internal Server Error!" });
    }
});



exports.getSlaveCropCalendarPrgress = asyncHandler(async (req, res) => {
    console.log("hittt")
    try {
        await getSlaveCropCalendarDaysSchema.validateAsync(req.params);

        const userId = req.user.ownerId;
        const cropCalendarId = req.params.cropCalendarId;
        const farmId = req.params.farmId


        const results = await cropDao.getSlaveCropCalendarPrgress(userId, cropCalendarId, farmId);

        if (results.length === 0) {
            return res.status(404).json({
                message: "No records found for the given userId and cropCalendarId.",

            });
        }

        return res.status(200).json(results);

    } catch (err) {
        console.error("Error in getSlaveCropCalendarDaysByUserAndCrop:", err);

        if (err.isJoi) {
            return res.status(400).json({
                status: 'error',
                message: err.details[0].message,
            });
        }

        return res.status(500).json({ message: "Internal Server Error!" });
    }
});

exports.updateCropCalendarStatus = asyncHandler(async (req, res) => {
    try {
        await updateCropCalendarStatusSchema.validateAsync(req.body);

        const { id, status } = req.body;
        console.log(",,,,,,,,,,,,,,,,,,,", id)
        const currentTime = new Date();

        const taskResults = await cropDao.getTaskById(id);
        if (taskResults.length === 0) {
            return res
                .status(404)
                .json({ message: "No record found with the provided id." });
        }

        const currentTask = taskResults[0];
        const {
            taskIndex,
            status: currentStatus,
            createdAt,
            cropCalendarId,
            days,
            startingDate,
            userId
        } = currentTask;

        if (currentStatus === "completed" && status === "pending") {
            const timeDiffInHours = Math.abs(currentTime - new Date(createdAt)) / 36e5;
            if (timeDiffInHours > 1) {
                return res.status(403).json({
                    message: "You cannot change the status back to pending after 1 hour of marking it as completed.",
                });
            }
        }
        if (status === "completed" && taskIndex > 1) {
            const previousTasksResults = await cropDao.getPreviousTasks(
                taskIndex,
                cropCalendarId,
                userId,
                status
            );

            let allPreviousTasksCompleted = true;
            let lastCompletedTask = null;
            for (const previousTask of previousTasksResults) {
                if (previousTask.status !== "completed") {
                    allPreviousTasksCompleted = false;
                    break;
                }
                lastCompletedTask = previousTask;
            }

            if (!allPreviousTasksCompleted) {
                return res
                    .status(400)
                    .json({
                        message: "You have to complete previous tasks before moving to the next.",
                    });
            }


        }

        const updateResults = await cropDao.updateTaskStatus(id, status);

        if (updateResults.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: "No record found with the provided id." });
        }

        if (status === "pending") {
            cropDao.gettaskImagesByID(id)
                .then((images) => {
                    if (!images || images.length === 0) {
                    } else {
                        if (Array.isArray(images)) {
                            images.forEach((img) => {
                                if (img.image) {
                                    const imageUrl = img.image;
                                    delectfilesOnS3(imageUrl);
                                } else {
                                }
                            });
                        } else if (images.image) {
                            const imageUrl = images.image;
                            delectfilesOnS3(imageUrl);
                        } else {
                            console.log("Image data structure is not as expected:", images);
                        }
                    }

                    return cropDao.deleteImagesBySlaveId(id);
                })
                .then((deleteImagesResult) => {
                })
                .catch((error) => {
                    console.error("Error deleting images:", error);
                    return res.status(500).json({ message: "Error deleting images" });
                })
                .finally(() => {
                    if (!res.headersSent) {
                        res.status(200).json({ message: "Status updated successfully." });
                    }
                });
            // cropDao.deleteGeoLocationByTaskId(id);
        } else {
            if (!res.headersSent) {
                res.status(200).json({ message: "Status updated successfully." });
            }
        }
    } catch (err) {
        console.error("Error updating status:", err);
        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }
        res.status(500).json({ message: "Internal Server Error!" });
    }
});


exports.addGeoLocation = asyncHandler(async (req, res) => {
    try {
        const { latitude, longitude, taskId, onCulscropID } = req.body;
        console.log("onCulscropID", onCulscropID);
        const taskExists = await cropDao.checkTaskExists(taskId);

        if (!taskExists) {
            return res.status(404).json({
                status: "error",
                message: `No task found for taskId ${taskId}. Please ensure the taskId is correct.`,
            });
        }


        const results = await cropDao.addGeoLocation(longitude, latitude, onCulscropID);

        if (results.affectedRows === 0) {
            return res.status(400).json({
                status: "error",
                message: "Failed to insert geo location.",
            });
        }

        res.status(200).json({
            status: "success",
            message: "Geo-location added successfully.",
            data: results,
        });
    } catch (err) {
        console.error("Error fetching geo location details:", err);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

exports.getUploadedImagesCount = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.ownerId;
        const cropId = req.params.cropId;

        const results = await cropDao.getUploadedImagesCount(userId, cropId);

        if (results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No records found for the given userId.",
            });
        }

        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching uploaded images count:", err);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});


exports.getTaskImage = asyncHandler(async (req, res) => {
    try {
        const { slaveId } = req.params;
        console.log("Fetching task images for slaveId:", slaveId);


        if (!slaveId) {
            return res.status(400).json({
                message: "slaveId is required"
            });
        }


        const taskResults = await cropDao.getTaskImage(slaveId);

        if (taskResults.length === 0) {
            return res.status(404).json({
                message: "No task images found for the provided slaveId."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task images retrieved successfully",
            data: taskResults,

        });

    } catch (error) {
        console.error("Error in getTaskImage:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});


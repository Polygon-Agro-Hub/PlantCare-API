const asyncHandler = require("express-async-handler");
const cropDao = require("../dao/userCrop-dao");

exports.createCrop = asyncHandler(async (req, res) => {
    try {
        const userId = req.userId;
        const { cropCalendar } = req.body;

        if (!cropCalendar) {
            return res.status(400).json({
                status: "error",
                message: "cropCalendar is required.",
            });
        }

        const cultivationResult = await cropDao.insertOngoingCultivation(userId);
        const ongoingCultivationId = cultivationResult.insertId;

        await cropDao.insertCultivationCrop(ongoingCultivationId, cropCalendar);

        return res.status(201).json({
            status: "success",
            message: "Crop created successfully.",
        });
    } catch (err) {
        console.error("Error creating crop:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error, please try again later.",
        });
    }
});

exports.viewCrops = asyncHandler(async (req, res) => {
    try {
        const userId = req.userId;

        const results = await cropDao.getCropsByUserId(userId);

        if (results.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No crops found for this user.",
            });
        }

        return res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching crops:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error, please try again later.",
        });
    }
});

exports.deleteCrop = asyncHandler(async (req, res) => {
    try {
        const userId = req.userId;
        const { cropId } = req.params;

        const result = await cropDao.deleteCropById(cropId, userId);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "Crop not found or not authorized to delete.",
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Crop deleted successfully.",
        });
    } catch (err) {
        console.error("Error deleting crop:", err);
        return res.status(500).json({
            status: "error",
            message: "Server error, please try again later.",
        });
    }
});

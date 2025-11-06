const asyncHandler = require("express-async-handler");
const requestInspectionDao = require("../dao/requestInspection-dao");

exports.getOfficerservices = asyncHandler(async (req, res) => {
    try {

        const requestInspection = await requestInspectionDao.getOfficerservices();
        console.log("far,ss", requestInspection)

        if (!requestInspection || requestInspection.length === 0) {
            return res.status(404).json({ message: "No requestInspection found" });
        }

        res.status(200).json(requestInspection);
    } catch (error) {
        console.error("Error fetching requestInspection:", error);
        res.status(500).json({ message: "Failed to fetch requestInspection" });
    }
});

exports.getFarms = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farmId = req.params.farmId;
        console.log("userIDdddddddddddddddddddddddddddd", userId)
        const farms = await requestInspectionDao.getAllFarmByUserId(userId);
        console.log("farmmmmmmmmmmmmmmmmmmmmmmmmmmm", farms)

        if (!farms || farms.length === 0) {
            return res.status(404).json({ message: "No farms found" });
        }

        res.status(200).json(farms);
    } catch (error) {
        console.error("Error fetching farms:", error);
        res.status(500).json({ message: "Failed to fetch farms" });
    }
});


exports.getFramCrop = asyncHandler(async (req, res) => {
    try {

        const farmId = req.params.farmId;
        console.log("farmIddddddddddddddddddddddddddddd", farmId)
        const farms = await requestInspectionDao.getFramCrop(farmId);
        console.log("farmmmmmmmmmmmmmmmmmmmmmmmmmmm", farms)

        if (!farms || farms.length === 0) {
            return res.status(404).json({ message: "No farms found" });
        }

        res.status(200).json(farms);
    } catch (error) {
        console.error("Error fetching farms:", error);
        res.status(500).json({ message: "Failed to fetch farms" });
    }
});

exports.submitRequestInspection = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestItems } = req.body;

        // Validate input
        if (!requestItems || !Array.isArray(requestItems) || requestItems.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Invalid request data. Please provide request items."
            });
        }

        // Validate each request item
        for (const item of requestItems) {
            if (!item.serviceId || !item.farmId || !item.scheduleDate || !item.amount) {
                return res.status(400).json({
                    status: "error",
                    message: "Missing required fields in request items"
                });
            }

            if (!item.crops || item.crops.length === 0) {
                return res.status(400).json({
                    status: "error",
                    message: "At least one crop must be selected for each request"
                });
            }
        }

        // Process all requests with transaction
        const results = await requestInspectionDao.submitRequestInspection(userId, requestItems);

        res.status(201).json({
            status: "success",
            message: "Request inspection submitted successfully",
            data: results
        });

    } catch (err) {
        console.error("Error submitting request inspection:", err);

        let statusCode = 500;
        let errorMessage = "Internal Server Error";

        if (err.message.includes('Failed to process request item')) {
            statusCode = 400;
            errorMessage = err.message;
        }

        res.status(statusCode).json({
            status: "error",
            message: errorMessage,
            error: err.message
        });
    }
});
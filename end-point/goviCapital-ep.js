const asyncHandler = require("express-async-handler");
const goviCapitalDao = require("../dao/goviCapital-dao");
const uploadFileToS3 = require('../Middlewares/s3upload');
const multer = require('multer');
const { createInvestmentRequestSchema } = require('../validations/goviCapital-validation');

// Configure multer for memory storage
const storage = multer.memoryStorage();
exports.uploadMultiple = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
        }
        cb(null, true);
    },
});

exports.getCrops = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const crops = await goviCapitalDao.getCrops(userId);

        if (!crops || crops.length === 0) {
            return res.status(404).json({ message: "No crops found" });
        }

        res.status(200).json(crops);
    } catch (error) {
        console.error("Error fetching crops:", error);
        res.status(500).json({ message: "Failed to fetch crops" });
    }
});

exports.getFarmerDetails = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farmer = await goviCapitalDao.getFarmerDetails(userId);

        if (!farmer || farmer.length === 0) {
            return res.status(404).json({ message: "No farmer found" });
        }

        res.status(200).json(farmer);
    } catch (error) {
        console.error("Error fetching farmer:", error);
        res.status(500).json({ message: "Failed to fetch farmer" });
    }
});

exports.createInvestmentRequest = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            cropId,
            extentha,
            extentac,
            extentp,
            investment,
            expectedYield,
            startDate,
            plotNumber,
            streetName,
            landCity
        } = req.body;


        // Joi Validation
        const { error } = createInvestmentRequestSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                message: "Validation error",
                details: error.details.map(detail => detail.message)
            });
        }

        // Check if both NIC images are uploaded
        if (!req.files || !req.files.nicFront || !req.files.nicBack) {
            return res.status(400).json({ message: "Both NIC images are required" });
        }

        // Upload NIC Front image to S3
        const nicFrontBuffer = req.files.nicFront[0].buffer;
        const nicFrontFileName = req.files.nicFront[0].originalname;
        const nicFrontUrl = await uploadFileToS3(
            nicFrontBuffer,
            nicFrontFileName,
            `govicapital/farmer${userId}/investment_requests`
        );

        // Upload NIC Back image to S3
        const nicBackBuffer = req.files.nicBack[0].buffer;
        const nicBackFileName = req.files.nicBack[0].originalname;
        const nicBackUrl = await uploadFileToS3(
            nicBackBuffer,
            nicBackFileName,
            `govicapital/farmer${userId}/investment_requests`
        );

        // Prepare data for database
        const requestData = {
            cropId: parseInt(cropId),
            farmerId: userId,
            extentha: parseFloat(extentha),
            extentac: parseFloat(extentac),
            extentp: parseFloat(extentp),
            investment: parseFloat(investment),
            expectedYield: parseFloat(expectedYield),
            startDate,
            nicFront: nicFrontUrl,
            nicBack: nicBackUrl,
            plotNumber: plotNumber,
            streetName: streetName,
            landCity: landCity
        };

        // Insert into database
        const result = await goviCapitalDao.createInvestmentRequest(requestData);

        res.status(201).json({
            message: "Investment request created successfully",
            requestId: result.insertId,
            imageDetails: {
                nicFront: {
                    url: nicFrontUrl,
                    size: req.files.nicFront[0].size,
                    mimeType: req.files.nicFront[0].mimetype
                },
                nicBack: {
                    url: nicBackUrl,
                    size: req.files.nicBack[0].size,
                    mimeType: req.files.nicBack[0].mimetype
                }
            }
        });

    } catch (error) {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File size exceeds the maximum allowed size of 10 MB.',
            });
        }
        console.error("Error creating investment request:", error);
        res.status(500).json({
            message: "Failed to create investment request",
            error: error.message
        });
    }
});


exports.getInvestmentRequests = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const requests = await goviCapitalDao.getInvestmentRequests(userId);

        if (!requests || requests.length === 0) {
            return res.status(404).json({ message: "No requests found" });
        }

        res.status(200).json(requests);
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ message: "Failed to fetch requests" });
    }
});


exports.getApprovedStatusDetails = asyncHandler(async (req, res) => {
    try {
        const invId = req.params.id;

        const invDetails = await goviCapitalDao.getApprovedStatusDetails(invId);

        if (!invDetails || invDetails.length === 0) {
            return res.status(404).json({ message: "No investment details found" });
        }

        res.status(200).json(invDetails);
    } catch (error) {
        console.error("Error fetching investment details:", error);
        res.status(500).json({ message: "Failed to fetch investment details" });
    }
});


exports.updateReviewStatus = asyncHandler(async (req, res) => {
    try {
        const invId = req.params.id;
        const result = await goviCapitalDao.updateReviewStatus(invId);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No investment found with this ID" });
        }

        res.status(200).json({
            message: "Review status updated successfully"
        });
    } catch (error) {
        console.error("Error updating review status:", error);
        res.status(500).json({ message: "Failed to update review status" });
    }
});
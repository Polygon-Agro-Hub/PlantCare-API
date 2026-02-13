const asyncHandler = require("express-async-handler");
const certificateDao = require("../dao/certificate-dao");
const uploadFileToS3 = require('../Middlewares/s3upload');
const multer = require('multer');

exports.getFarmsCertificate = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;

        // Validate farmId
        if (!farmId) {
            return res.status(400).json({ message: "Farm ID is required" });
        }

        const certificates = await certificateDao.getFarmsCertificate(farmId);

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({ message: "No certificates found for this farm" });
        }

        res.status(200).json(certificates);
    } catch (error) {
        console.error("Error fetching farm certificates:", error);
        res.status(500).json({ message: "Failed to fetch farm certificates" });
    }
});

// Certificate Payment Endpoint - Fixed Version

exports.createCertificatePayment = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farmId = req.params.farmId;
        const { certificateId, amount, validityMonths } = req.body;


        // Validate required fields
        if (!certificateId || !amount || !validityMonths) {
            console.error("Missing required fields");
            return res.status(400).json({
                message: "Certificate ID, amount, and validity months are required"
            });
        }

        // Validate farmId
        if (!farmId || isNaN(farmId)) {
            console.error("Invalid farm ID");
            return res.status(400).json({
                message: "Valid farm ID is required"
            });
        }

        // Validate data types
        if (isNaN(certificateId) || isNaN(amount) || isNaN(validityMonths)) {
            console.error("Invalid data types");
            return res.status(400).json({
                message: "Certificate ID, amount, and validity months must be valid numbers"
            });
        }

        // Generate transaction ID
        const transactionId = await certificateDao.generateTransactionId();
     

        // Calculate expiry date (current date + validity months)
        const currentDate = new Date();
        const expireDate = new Date(currentDate);
        expireDate.setMonth(expireDate.getMonth() + parseInt(validityMonths));


        const paymentData = {
            certificateId: parseInt(certificateId),
            userId: userId,
            payType: 'Farm',
            transactionId: transactionId,
            amount: parseFloat(amount),
            expireDate: expireDate,
            farmId: parseInt(farmId)
        };


        // Save payment to database (this will now handle both tables)
        const result = await certificateDao.createCertificatePayment(paymentData);

        if (!result || !result.paymentId) {
            console.error("Failed to create certificate payment");
            return res.status(500).json({
                message: "Failed to create certificate payment"
            });
        }


        res.status(201).json({
            message: "Certificate payment created successfully",
            data: {
                paymentId: result.paymentId,
                transactionId: transactionId,
                expireDate: expireDate,
                farmId: farmId
            }
        });

    } catch (error) {
        console.error("Error creating certificate payment:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
            message: "Failed to create certificate payment",
            error: error.message
        });
    }
});

//crop

exports.getCropsCertificate = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        const cropId = req.params.cropId;


        if (!farmId) {
            return res.status(400).json({ message: "Farm ID is required" });
        }
        if (!cropId) {
            return res.status(400).json({ message: "Crop ID is required" });
        }

        const certificates = await certificateDao.getCropsCertificate(farmId, cropId);

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({ message: "No certificates found for this crop" });
        }

        res.status(200).json(certificates);
    } catch (error) {
        console.error("Error fetching crop certificates:", error);
        res.status(500).json({ message: "Failed to fetch crop certificates" });
    }
});

// Certificate Payment Endpoint - Fixed Version

exports.createCropCertificatePayment = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const cropId = req.params.cropId;
        const { certificateId, amount, validityMonths } = req.body;


        // Validate required fields
        if (!certificateId || !amount || !validityMonths) {
            console.error("Missing required fields");
            return res.status(400).json({
                message: "Certificate ID, amount, and validity months are required"
            });
        }

        // Validate cropId
        if (!cropId || isNaN(cropId)) {
            console.error("Invalid cropId");
            return res.status(400).json({
                message: "Valid cropId is required"
            });
        }

        // Validate data types
        if (isNaN(certificateId) || isNaN(amount) || isNaN(validityMonths)) {
            console.error("Invalid data types");
            return res.status(400).json({
                message: "Certificate ID, amount, and validity months must be valid numbers"
            });
        }

        // Generate transaction ID
        const transactionId = await certificateDao.generateTransactionId();
     

        // Calculate expiry date (current date + validity months)
        const currentDate = new Date();
        const expireDate = new Date(currentDate);
        expireDate.setMonth(expireDate.getMonth() + parseInt(validityMonths));

        

        const paymentData = {
            certificateId: parseInt(certificateId),
            userId: userId,
            payType: 'Crop',
            transactionId: transactionId,
            amount: parseFloat(amount),
            expireDate: expireDate,
            cropId: parseInt(cropId)
        };


        // Save payment to database (this will now handle both tables)
        const result = await certificateDao.createCropCertificatePayment(paymentData);

        if (!result || !result.paymentId) {
            console.error("Failed to create certificate payment");
            return res.status(500).json({
                message: "Failed to create certificate payment"
            });
        }


        res.status(201).json({
            message: "Certificate payment created successfully",
            data: {
                paymentId: result.paymentId,
                transactionId: transactionId,
                expireDate: expireDate,
                cropId: cropId
            }
        });

    } catch (error) {
        console.error("Error creating certificate payment:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
            message: "Failed to create certificate payment",
            error: error.message
        });
    }
});


exports.getCropHvaeCertificate = asyncHandler(async (req, res) => {
    try {
        const cropId = req.params.cropId;
        const userId = req.user.id;

        const certificates = await certificateDao.getCropHvaeCertificate(cropId, userId);


        if (!certificates || certificates.length === 0) {
            return res.status(200).json({
                status: "notHaveCropCertificate",
                message: "No certificates found for this crop",
                data: []
            });
        }

        res.status(200).json({
            status: "haveCropCertificate",
            message: "Certificates found",
            data: certificates
        });
    } catch (error) {
        console.error("Error fetching crop certificates:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch crop certificates"
        });
    }
});


exports.getCropCertificateByid = asyncHandler(async (req, res) => {
    try {
        const cropId = req.params.cropId;
        const userId = req.user.id;

        const certificates = await certificateDao.getCropCertificateByid(cropId, userId);

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({ message: "No certificates found for farms" });
        }

        res.status(200).json(certificates);
    } catch (error) {
        console.error("Error fetching farm certificates:", error);
        res.status(500).json({ message: "Failed to fetch farm certificates" });
    }
});






// Update for Tick Off
exports.updateQuestionItemByid = asyncHandler(async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const { type } = req.body;


        // Get the item first to check its type
        const item = await certificateDao.getQuestionItemById(itemId);

        if (!item) {
            return res.status(404).json({ message: "Questionnaire item not found" });
        }

        // Update based on type
        if (item.type === 'Tick Off') {
            const result = await certificateDao.updateQuestionItemByid(itemId, {
                type: 'tickOff'
            });
            return res.status(200).json(result);
        } else {
            return res.status(400).json({
                message: "This item requires photo proof, use the upload image endpoint"
            });
        }

    } catch (error) {
        console.error("Error updating questionnaire item:", error);
        res.status(500).json({ message: "Failed to update questionnaire item" });
    }
});

// New endpoint for Photo Proof upload
exports.uploadQuestionnaireImage = asyncHandler(async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const { itemId, slaveId, farmId } = req.body;
        const ownerId = req.user.ownerId;
        const userId = req.user.id;

        if (!itemId || !slaveId) {
            return res.status(400).json({ message: 'itemId and slaveId are required.' });
        }

        // Get the item to verify it's a Photo Proof type
        const item = await certificateDao.getQuestionItemById(itemId);

        if (!item) {
            return res.status(404).json({ message: "Questionnaire item not found" });
        }

        if (item.type !== 'Photo Proof') {
            return res.status(400).json({
                message: "This item is not a Photo Proof type"
            });
        }

        const imageBuffer = req.file.buffer;
        const fileName = req.file.originalname;

        // Upload to S3
        const imageUrl = await uploadFileToS3(
            imageBuffer,
            fileName,
            `questionnaire/owner${ownerId}/farm${farmId}/slave${slaveId}`
        );

        // Update the questionnaire item with image URL
        const result = await certificateDao.updateQuestionItemByid(itemId, {
            type: 'photoProof',
            imageUrl: imageUrl
        });

        res.status(200).json({
            success: true,
            message: 'Questionnaire image uploaded successfully.',
            imageUrl: imageUrl,
            imageDetails: {
                mimeType: req.file.mimetype,
                size: req.file.size,
            },
            result: result,
        });
    } catch (error) {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File size exceeds the maximum allowed size of 10 MB.',
            });
        }
        console.error('Error during questionnaire image upload:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});


exports.getFarmName = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;


        const farm = await certificateDao.getFarmName(farmId);

        if (!farm || farm.length === 0) {
            return res.status(404).json({ message: "Farm not found" });
        }

        res.status(200).json(farm);
    } catch (error) {
        console.error("Error fetching farm name:", error);
        res.status(500).json({ message: "Failed to fetch farm name" });
    }
});




exports.getFarmcertificateCrop = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId; // Fixed: was cropId


        const farm = await certificateDao.getFarmcertificateCrop(farmId);

        if (!farm || farm.length === 0) {
            return res.status(404).json({ message: "Farm not found" });
        }

        res.status(200).json(farm);
    } catch (error) {
        console.error("Error fetching farm name:", error);
        res.status(500).json({ message: "Failed to fetch farm name" });
    }
});

exports.getFarmCertificate = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        const userId = req.user.id;


        const certificates = await certificateDao.getFarmCertificate(farmId, userId);


        if (!certificates || certificates.length === 0) {
            return res.status(200).json({
                status: "noFarmCertificate", 
                message: "No certificates found for this farm",
                data: []
            });
        }
        res.status(200).json({
            status: "haveFarmCertificate",
            message: "Certificates found",
            data: certificates
        });
    } catch (error) {
        console.error("Error fetching farm certificates:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch farm certificates"
        });
    }
});


exports.getFarmCertificateTask = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.farmId;
        const userId = req.user.id;


        // First, try to get farm certificates
        let certificates = await certificateDao.getFarmCertificateTask(farmId, userId);

        // If no farm certificates found, try to get cluster certificates
        if (!certificates || certificates.length === 0) {
            certificates = await certificateDao.getClusterCertificateTask(farmId, userId);
        }

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({
                message: "No certificates found for farm or cluster"
            });
        }

        res.status(200).json(certificates);
    } catch (error) {
        console.error("Error fetching certificates:", error);
        res.status(500).json({ message: "Failed to fetch certificates" });
    }
});



exports.removeQuestionnaireItem = asyncHandler(async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const userId = req.user.id;


        if (!itemId) {
            return res.status(400).json({ message: 'itemId is required.' });
        }

        // Get the item to check completion time and verify details
        const item = await certificateDao.getQuestionItemById(itemId);

        if (!item) {
            return res.status(404).json({ message: "Questionnaire item not found" });
        }

        // Check if the item was completed within the last 1 hour
        if (!item.doneDate) {
            return res.status(400).json({
                message: "This item is not completed yet"
            });
        }

        const completionTime = new Date(item.doneDate);
        const currentTime = new Date();
        const timeDifference = currentTime - completionTime;
        const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

        if (timeDifference > oneHourInMs) {
            return res.status(403).json({
                message: "Cannot remove completion after 1 hour. Please contact administrator.",
                completedAt: item.doneDate,
                timeElapsed: Math.floor(timeDifference / (1000 * 60)) + ' minutes'
            });
        }

        // Remove the completion based on item type
        const result = await certificateDao.removeQuestionItemCompletion(itemId, item.type);

        res.status(200).json({
            success: true,
            message: 'Questionnaire item completion removed successfully.',
            result: result,
        });
    } catch (error) {
        console.error('Error during questionnaire item removal:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

exports.getCropNames = asyncHandler(async (req, res) => {
    try {
        const cropId = req.params.cropId;
        const certificates = await certificateDao.getCropNames(cropId);


        if (!certificates || certificates.length === 0) {
            return res.status(404).json({ message: "No certificates found for farms" });
        }

        res.status(200).json(certificates);
    } catch (error) {
        console.error("Error fetching farm certificates:", error);
        res.status(500).json({ message: "Failed to fetch farm certificates" });
    }
});


// endpoint.js - Fix the endpoint to use params instead of body
exports.getFarms = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const farmId = req.params.farmId; // Changed from req.body.farmId to req.params.farmId

        const farms = await certificateDao.getAllFarmByUserId(userId, farmId);

        if (!farms || farms.length === 0) {
            return res.status(404).json({ message: "No farms found" });
        }

        // Return single farm with certificate status
        const farm = farms[0];
        res.status(200).json({
            status: farm.certificationStatus === 'Certificate' ? 'haveFarmCertificate' : 'noFarmCertificate',
            data: farm
        });
    } catch (error) {
        console.error("Error fetching farms:", error);
        res.status(500).json({ message: "Failed to fetch farms" });
    }
});
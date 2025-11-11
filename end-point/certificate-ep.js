const asyncHandler = require("express-async-handler");
const certificateDao = require("../dao/certificate-dao");


exports.getFarmsCertificate = asyncHandler(async (req, res) => {
    try {
        const certificates = await certificateDao.getFarmsCertificate();

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({ message: "No certificates found for farms" });
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

        console.log("Received payment request:", {
            userId,
            farmId,
            certificateId,
            amount,
            validityMonths
        });

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
        console.log("Generated transaction ID:", transactionId);

        // Calculate expiry date (current date + validity months)
        const currentDate = new Date();
        const expireDate = new Date(currentDate);
        expireDate.setMonth(expireDate.getMonth() + parseInt(validityMonths));

        console.log("Calculated expiry date:", expireDate);

        const paymentData = {
            certificateId: parseInt(certificateId),
            userId: userId,
            payType: 'Farm',
            transactionId: transactionId,
            amount: parseFloat(amount),
            expireDate: expireDate,
            farmId: parseInt(farmId)
        };

        console.log("Payment data to be saved:", paymentData);

        // Save payment to database (this will now handle both tables)
        const result = await certificateDao.createCertificatePayment(paymentData);

        if (!result || !result.paymentId) {
            console.error("Failed to create certificate payment");
            return res.status(500).json({
                message: "Failed to create certificate payment"
            });
        }

        console.log("Certificate payment created successfully:", result);

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
        const certificates = await certificateDao.getCropsCertificate();

        if (!certificates || certificates.length === 0) {
            return res.status(404).json({ message: "No certificates found for farms" });
        }

        res.status(200).json(certificates);
    } catch (error) {
        console.error("Error fetching farm certificates:", error);
        res.status(500).json({ message: "Failed to fetch farm certificates" });
    }
});


// Certificate Payment Endpoint - Fixed Version

exports.createCropCertificatePayment = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const cropId = req.params.cropId;
        const { certificateId, amount, validityMonths } = req.body;

        console.log("Received payment request:", {
            userId,
            cropId,
            certificateId,
            amount,
            validityMonths
        });

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
        console.log("Generated transaction ID:", transactionId);

        // Calculate expiry date (current date + validity months)
        const currentDate = new Date();
        const expireDate = new Date(currentDate);
        expireDate.setMonth(expireDate.getMonth() + parseInt(validityMonths));

        console.log("Calculated expiry date:", expireDate);

        const paymentData = {
            certificateId: parseInt(certificateId),
            userId: userId,
            payType: 'Crop',
            transactionId: transactionId,
            amount: parseFloat(amount),
            expireDate: expireDate,
            cropId: parseInt(cropId)
        };

        console.log("Payment data to be saved:", paymentData);

        // Save payment to database (this will now handle both tables)
        const result = await certificateDao.createCropCertificatePayment(paymentData);

        if (!result || !result.paymentId) {
            console.error("Failed to create certificate payment");
            return res.status(500).json({
                message: "Failed to create certificate payment"
            });
        }

        console.log("Certificate payment created successfully:", result);

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

        //  console.log("////////////////////////////////////////////", this.getCropHvaeCertificate.Date)

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

        console.log("cropid......................", cropId)
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

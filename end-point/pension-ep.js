const pensionRequestDao = require("../dao/pension-dao");
const asyncHandler = require('express-async-handler');
const uploadFileToS3 = require('../Middlewares/s3upload')

exports.checkPensionRequestStatus = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;

        const pensionStatus = await pensionRequestDao.checkPensionRequestByUserId(userId);

        if (!pensionStatus) {
            return res.status(200).json({
                status: false,
                message: "No pension request found for this user."
            });
        }

        res.status(200).json({
            status: true,
            reqStatus: pensionStatus.reqStatus,
            requestId: pensionStatus.id,
            defaultPension: parseFloat(pensionStatus.defaultPension),
            userCreatedAt: pensionStatus.userCreatedAt,
            requestCreatedAt: pensionStatus.requestCreatedAt
        });
    } catch (err) {
        console.error("Error checking pension request status:", err);
        res.status(500).json({
            status: "error",
            message: "An error occurred while checking pension request status."
        });
    }
});


exports.submitPensionRequest = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if user already has a pension request
        const existingRequest = await pensionRequestDao.checkPensionRequestByUserId(userId);
        if (existingRequest) {
            return res.status(400).json({
                status: false,
                message: "You already have a pension request submitted."
            });
        }

        // Validate required fields
        const { fullName, nic, dob, sucFullName, sucType, sucdob } = req.body;

        console.log("Received pension request data:", req.body);
        console.log("Received files:", req.files);
        
        if (!fullName || !nic || !dob || !sucFullName || !sucType || !sucdob) {
            return res.status(400).json({
                status: false,
                message: "Missing required fields."
            });
        }

        // Validate required files
        if (!req.files || !req.files.nicFront || !req.files.nicBack) {
            return res.status(400).json({
                status: false,
                message: "NIC front and back images are required."
            });
        }

        // Upload images to Cloudflare R2
        const nicFrontUrl = await uploadFileToS3(
            req.files.nicFront[0].buffer,
            req.files.nicFront[0].originalname,
            `pension-requests/${userId}/applicant`
        );

        const nicBackUrl = await uploadFileToS3(
            req.files.nicBack[0].buffer,
            req.files.nicBack[0].originalname,
            `pension-requests/${userId}/applicant`
        );

        // Upload successor NIC images if provided
        let sucNicFrontUrl = null;
        let sucNicBackUrl = null;

        if (req.files.sucNicFront && req.files.sucNicFront[0]) {
            sucNicFrontUrl = await uploadFileToS3(
                req.files.sucNicFront[0].buffer,
                req.files.sucNicFront[0].originalname,
                `pension-requests/${userId}/successor`
            );
        }

        if (req.files.sucNicBack && req.files.sucNicBack[0]) {
            sucNicBackUrl = await uploadFileToS3(
                req.files.sucNicBack[0].buffer,
                req.files.sucNicBack[0].originalname,
                `pension-requests/${userId}/successor`
            );
        }

        // Prepare pension data
        const pensionData = {
            userId,
            fullName,
            nic,
            nicFront: nicFrontUrl,
            nicBack: nicBackUrl,
            dob,
            sucFullName,
            sucType,
            sucNic: req.body.sucNic || null,
            sucNicFront: sucNicFrontUrl,
            sucNicBack: sucNicBackUrl,
            sucdob
        };

        // Create pension request
        const requestId = await pensionRequestDao.createPensionRequest(pensionData);

        res.status(201).json({
            status: true,
            message: "Pension request submitted successfully.",
            requestId
        });

    } catch (err) {
        console.error("Error submitting pension request:", err);
        res.status(500).json({
            status: false,
            message: "An error occurred while submitting pension request."
        });
    }
});
const pensionRequestDao = require("../dao/pension-dao");
const asyncHandler = require("express-async-handler");
const uploadFileToS3 = require("../Middlewares/s3upload");

// Check Pension Request Status
exports.checkPensionRequestStatus = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const pensionStatus =
      await pensionRequestDao.checkPensionRequestByUserId(userId);

    if (!pensionStatus) {
      return res.status(200).json({
        status: false,
        message: "No pension request found for this user.",
      });
    }

    res.status(200).json({
      status: true,
      reqStatus: pensionStatus.reqStatus,
      requestId: pensionStatus.id,
      defaultPension: parseFloat(pensionStatus.defaultPension),
      userCreatedAt: pensionStatus.userCreatedAt,
      isFirstTime: pensionStatus.isFirstTime,
      requestCreatedAt: pensionStatus.requestCreatedAt,
    });
  } catch (err) {
    console.error("Error checking pension request status:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred while checking pension request status.",
    });
  }
});

// Submit Pension Request
exports.submitPensionRequest = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has a pension request
    const existingRequest =
      await pensionRequestDao.checkPensionRequestByUserId(userId);
    if (existingRequest) {
      return res.status(400).json({
        status: false,
        message: "You already have a pension request submitted.",
      });
    }

    // Validate required fields
    const { fullName, nic, dob, sucFullName, sucType, sucdob } = req.body;

    console.log("Received pension request data:", req.body);
    console.log("Received files:", req.files);

    if (!fullName || !nic || !dob || !sucFullName || !sucType || !sucdob) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields.",
      });
    }

    // Validate required files
    if (!req.files || !req.files.nicFront || !req.files.nicBack) {
      return res.status(400).json({
        status: false,
        message: "NIC front and back images are required.",
      });
    }

    // Upload applicant NIC images to Cloudflare R2
    const nicFrontUrl = await uploadFileToS3(
      req.files.nicFront[0].buffer,
      req.files.nicFront[0].originalname,
      `pension-requests/${userId}/applicant`,
    );

    const nicBackUrl = await uploadFileToS3(
      req.files.nicBack[0].buffer,
      req.files.nicBack[0].originalname,
      `pension-requests/${userId}/applicant`,
    );

    // Upload successor NIC images if provided
    let sucNicFrontUrl = null;
    let sucNicBackUrl = null;
    let birthCrtFrontUrl = null;
    let birthCrtBackUrl = null;

    // Check if successor is over 18 (based on date)
    const sucDob = new Date(sucdob);
    const today = new Date();
    const age = today.getFullYear() - sucDob.getFullYear();
    const monthDiff = today.getMonth() - sucDob.getMonth();
    const isOver18 = age > 18 || (age === 18 && monthDiff >= 0);

    if (isOver18) {
      // Successor is over 18, require NIC
      if (!req.files.sucNicFront || !req.files.sucNicBack) {
        return res.status(400).json({
          status: false,
          message:
            "Successor NIC front and back images are required for persons 18 or older.",
        });
      }

      sucNicFrontUrl = await uploadFileToS3(
        req.files.sucNicFront[0].buffer,
        req.files.sucNicFront[0].originalname,
        `pension-requests/${userId}/successor`,
      );

      sucNicBackUrl = await uploadFileToS3(
        req.files.sucNicBack[0].buffer,
        req.files.sucNicBack[0].originalname,
        `pension-requests/${userId}/successor`,
      );
    } else {
      // Successor is under 18, require birth certificate
      if (!req.files.birthCrtFront || !req.files.birthCrtBack) {
        return res.status(400).json({
          status: false,
          message:
            "Birth certificate front and back images are required for persons under 18.",
        });
      }

      birthCrtFrontUrl = await uploadFileToS3(
        req.files.birthCrtFront[0].buffer,
        req.files.birthCrtFront[0].originalname,
        `pension-requests/${userId}/successor`,
      );

      birthCrtBackUrl = await uploadFileToS3(
        req.files.birthCrtBack[0].buffer,
        req.files.birthCrtBack[0].originalname,
        `pension-requests/${userId}/successor`,
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
      birthCrtFront: birthCrtFrontUrl,
      birthCrtBack: birthCrtBackUrl,
      sucdob,
    };

    // Create pension request
    const requestId =
      await pensionRequestDao.submitPensionRequestDAO(pensionData);

    res.status(201).json({
      status: true,
      message: "Pension request submitted successfully.",
      requestId,
    });
  } catch (err) {
    console.error("Error submitting pension request:", err);
    res.status(500).json({
      status: false,
      message: "An error occurred while submitting pension request.",
    });
  }
});


exports.updateFirstTimeStatus = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pensionRequestDao.updateFirstTimeStatus(userId);

        if (!result) {
            return res.status(404).json({
                status: "error",
                message: "No pension request found for this user."
            });
        }

        res.status(200).json({
            status: "success",
            message: "First time status updated successfully.",
            data: result
        });
    } catch (err) {
        console.error("Error updating first time status:", err);
        res.status(500).json({
            status: "error",
            message: "An error occurred while updating first time status."
        });
    }
});
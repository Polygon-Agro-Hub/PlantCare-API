const jwt = require("jsonwebtoken");
const db = require("../startup/database");
const asyncHandler = require("express-async-handler");
const userAuthDao = require("../dao/userAuth-dao");
const userProfileDao = require("../dao/userAuth-dao");
const signupDao = require('../dao/userAuth-dao');
const ValidationSchema = require('../validations/userAuth-validation')
const uploadFileToS3 = require('../Middlewares/s3upload');
const delectfilesOnS3 = require('../Middlewares/s3delete')
const delectfloders3 = require('../Middlewares/s3folderdelete')


exports.loginUser = async (req, res) => {
    console.log("hittt")
    try {
        const { phonenumber } = await ValidationSchema.loginUserSchema.validateAsync(req.body);
        const users = await userAuthDao.loginUser(phonenumber);

        if (!users || users.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "User not found",
            });
        }

        const user = users[0];
        console.log("user", user)
        // const token = jwt.sign({
        //     id: user.id, phoneNumber: user.phoneNumber, membership: user.membership,
        //     paymentActiveStatus: user.paymentActiveStatus,
        //     farmCount: user.farmCount
        // },
        //     process.env.JWT_SECRET || Tl, {
        //     expiresIn: "8h",
        // }
        // );
        const token = jwt.sign({
            id: user.id, phoneNumber: user.phoneNumber, membership: user.membership, ownerId: user.ownerId, role:user.role, farmId:user.farmId

        },
            process.env.JWT_SECRET || Tl, {
            expiresIn: "8h",
        }

        );

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "Tl");
        const { membership, paymentActiveStatus, farmCount } = decoded;
        console.log("decodeeeeeeeee", decoded)


        console.log("------token----------", token)

        res.status(200).json({
            status: "success",
            message: "Login successful",
            token,
            user: {
                membership: user.membership,
                paymentActiveStatus: user.paymentActiveStatus,
                farmCount: user.farmCount,
                role: user.role,
                farmId: user.farmId
            }
        });
    } catch (err) {
        console.error("hi.... Error:", err);
        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }
        res
            .status(500)
            .json({ status: "error", message: "An error occurred during login." });
    }
};


exports.SignupUser = asyncHandler(async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, NICnumber, district, farmerLanguage } =
            await ValidationSchema.signupUserSchema.validateAsync(req.body);

        console.log("Signup User Data:", req.body);

        const formattedPhoneNumber = `+${String(phoneNumber).replace(/^\+/, "")}`;

        // Check if the phone number already exists in the database
        const existingUser = await userAuthDao.checkUserByPhoneNumber(
            formattedPhoneNumber
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: "This mobile number exists in the database, please try another number!",
            });
        }

        const result = await userAuthDao.insertUser(
            firstName,
            lastName,
            formattedPhoneNumber,
            NICnumber,
            district,
            farmerLanguage
        );

        const payload = {
            id: result.insertId,
            phoneNumber: formattedPhoneNumber,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "24h",
        });

        res.status(200).json({
            message: "User registered successfully!",
            result,
            token,
        });
    } catch (err) {
        console.error("Error in SignUp:", err);
        if (err.isJoi) {
            return res.status(400).json({ message: err.details[0].message });
        }
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

// exports.getProfileDetails = asyncHandler(async (req, res) => {
//     try {
//          const token = req.headers.authorization?.split(" ")[1];
//          const decoded = jwt.verify(token, process.env.JWT_SECRET || "Tl");

//         const {  membership, paymentActiveStatus, farmCount } = decoded;
//         console.log(decoded)
//         const userId = req.user.id;
//         // Retrieve user profile from the database using the DAO function
//         const user = await userProfileDao.getUserProfileById(userId);

//         if (!user) {
//             return res.status(404).json({
//                 status: "error",
//                 message: "User not found",
//             });
//         }

//         res.status(200).json({
//             status: "success",
//             user: user,
//             usermembership: {
//  membership: membership,
//                 paymentActiveStatus: paymentActiveStatus,
//                 farmCount : farmCount
//             }
//         });
//     } catch (err) {
//         console.error("Error fetching profile details:", err);
//         res.status(500).json({
//             status: "error",
//             message: "An error occurred while fetching profile details.",
//         });
//     }
// });


exports.getProfileDetails = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const ownerId = req.user.ownerId
        const userrole = req.user.role

        // Retrieve user profile from the database using the DAO function
        const user = await userProfileDao.getUserProfileById(userId, ownerId, userrole);

        console.log("usetttt", user)

        if (!user) {
            return res.status(404).json({
                status: "error",    
                message: "User not found",
            });
        }

        // Extract the additional fields from the user object
        const { id, membership, paymentActiveStatus, farmCount,role, ...userProfile } = user;

        res.status(200).json({
            status: "success",
            user: userProfile,
            usermembership: {
                id: id,
                membership: membership,
                paymentActiveStatus: paymentActiveStatus,
                farmCount: farmCount,
                role: role
            }
        });
    } catch (err) {
        console.error("Error fetching profile details:", err);
        res.status(500).json({
            status: "error",
            message: "An error occurred while fetching profile details.",
        });
    }
});

exports.updatePhoneNumber = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Validate the request body
    await updatePhoneNumberSchema.validateAsync(req.body);

    const results = await userAuthDao.updateUserPhoneNumber(
        userId,
        newPhoneNumber
    );

    if (results.affectedRows === 0) {
        return res.status(404).json({
            status: "error",
            message: "User not found",
        });
    }

    return res.status(200).json({
        status: "success",
        message: "Phone number updated successfully",
    });
});

exports.signupChecker = asyncHandler(async (req, res) => {
    try {
        const { phoneNumber, NICnumber } =
            await ValidationSchema.signupCheckerSchema.validateAsync(req.body);

        const results = await signupDao.checkSignupDetails(phoneNumber, NICnumber);

        let phoneNumberExists = false;
        let NICnumberExists = false;

        results.forEach((user) => {
            if (user.phoneNumber === `+${String(phoneNumber).replace(/^\+/, "")}`) {
                phoneNumberExists = true;
            }
            if (user.NICnumber === NICnumber) {
                NICnumberExists = true;
            }
        });

        if (phoneNumberExists && NICnumberExists) {
            return res
                .status(200)
                .json({ message: "This Phone Number and NIC already exist." });
        } else if (phoneNumberExists) {
            return res
                .status(200)
                .json({ message: "This Phone Number already exists." });
        } else if (NICnumberExists) {
            return res.status(200).json({ message: "This NIC already exists." });
        }

        res.status(200).json({ message: "Both fields are available!" });
    } catch (err) {
        console.error("Error in signupChecker:", err);

        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }

        res.status(500).json({ message: "Internal Server Error!" });
    }
});

exports.updateFirstLastName = asyncHandler(async (req, res) => {
    try {
        console.log("Hitt update")
        // const { firstName, lastName, buidingname, streetname, city , district } =
        // await ValidationSchema.updateFirstLastNameSchema.validateAsync(req.body);
        // console.log("Hiiii")

        const sanitizedBody = Object.fromEntries(
            Object.entries(req.body).map(([key, value]) => [key, value === "" ? null : value])
        );

        const { firstName, lastName, buidingname, streetname, city, district } =
            await ValidationSchema.updateFirstLastNameSchema.validateAsync(sanitizedBody);

        const userId = req.user.id;

        const affectedRows = await userAuthDao.updateFirstLastName(
            userId,
            firstName,
            lastName,
            buidingname,
            streetname,
            city,
            district
        );

        if (affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "User not found",
            });
        }

        return res.status(200).json({
            status: "success",
            message: "First and last name updated successfully",
        });
    } catch (err) {
        console.error("Error updating first and last name:", err);

        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }

        res.status(500).json({ error: "Internal Server Error" });
    }
});

const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.plantcare.query(sql, params, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
};

exports.registerBankDetails = async (req, res) => {
    const {
        accountNumber,
        accountHolderName,
        bankName,
        branchName,
    } = req.body;

    const userId = req.user.id;
    const ownerId = req.user.ownerId;

    try {
        const bankDetailsExist = await userAuthDao.checkBankDetailsExist(userId);

        if (bankDetailsExist) {
            return res.status(400).json({
                message: "Bank details already exist for this user",
            });
        }

        try {
            const response = await userAuthDao.insertBankDetails(
                userId,
                accountNumber,
                accountHolderName,
                bankName,
                branchName
            );

            await new Promise((resolve, reject) => {
                userAuthDao.createQrCode(userId, ownerId)
                    .then(successMessage => {
                        console.log("QR code created successfully:", successMessage);
                        resolve(successMessage);
                    })
                    .catch(qrErr => {
                        console.error("Error creating QR code:", qrErr);
                        reject(qrErr);
                    });
            });

            return res.status(200).json({
                message: "Bank details registered successfully",
                bankData: {
                    userId,
                    accountHolderName,
                    accountNumber,
                    bankName,
                    branchName
                },
            });
        } catch (transactionErr) {
            // Rollback the transaction on error
            await db.plantcare.promise().rollback();
            console.error("Error during transaction:", transactionErr);
            return res.status(500).json({
                message: "Failed to complete transaction",
                error: transactionErr.message,
            });
        }
    } catch (err) {
        console.error("Error processing request:", err);
        return res.status(500).json({
            message: "An error occurred",
            error: err.message,
        });
    }
};


exports.uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const ownerId = req.user.ownerId
        console.log("ownerID", ownerId)

        // console.log("R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID);
        // console.log("R2_BUCKET_NAME", process.env.R2_BUCKET_NAME);
        // console.log("R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID);
        // console.log("R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY);
        // console.log("R2_REGION", process.env.R2_REGION);
        // console.log("R2_ENDPOINT", process.env.R2_ENDPOINT);

        const existingProfileImage = await userAuthDao.getUserProfileImage(userId);
        if (existingProfileImage) {
            delectfilesOnS3(existingProfileImage);
        }

        // await delectfloders3(`users/profile-images/owner${ownerId}/user${userId}`)

        let profileImageUrl = null;

        if (req.file) {
            const fileName = req.file.originalname;
            const imageBuffer = req.file.buffer;

            const uploadedImage = await uploadFileToS3(imageBuffer, fileName, `plantcareuser/owner${ownerId}/user${userId}`);
            profileImageUrl = uploadedImage;
        } else {
        }
        await userAuthDao.updateUserProfileImage(userId, profileImageUrl);

        res.status(200).json({
            status: "success",
            message: "Profile image uploaded successfully",
            profileImageUrl,
        });
    } catch (err) {
        console.error("Error uploading profile image:", err);

        if (err.isJoi) {
            return res.status(400).json({
                status: "error",
                message: err.details[0].message,
            });
        }

        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(400).json({
                status: "error",
                message: "User ID is required.",
            });
        }

        const userdetailsresult = await userAuthDao.getUserProfileById(userId);

        if (!userdetailsresult) {
            return res.status(404).json({
                status: "error",
                message: "User not found.",
            });
        }

        const firstname = userdetailsresult.firstName;
        const lastname = userdetailsresult.lastName;

        const deleteuserResult = await userAuthDao.savedeletedUser(firstname, lastname);

        const deletedUserId = deleteuserResult.insertId;

        const { feedbackIds } = req.body;

        for (const feedbackId of feedbackIds) {
            await userAuthDao.saveUserFeedback({
                feedbackId,
                deletedUserId,
            });
        }

        const deleteResult = await userAuthDao.deleteUserById(userId);

        if (!deleteResult || deleteResult.affectedRows === 0) {
            return res.status(404).json({
                status: "error",
                message: "User not found or already deleted.",
            });
        }

        return res.status(200).json({
            status: "success",
            message: "User account deleted successfully.",
        });
    } catch (err) {
        console.error("Error deleting user:", err);

        return res.status(500).json({
            status: "error",
            message: "Internal server error. Please try again later.",
        });
    }
};



exports.getFeedbackOptions = async (req, res) => {
    try {
        const feedbackOptions = await userAuthDao.getFeedbackOptions();

        return res.status(200).json({
            status: 'success',
            feedbackOptions,
        });
    } catch (err) {
        console.error('Error fetching feedback options:', err);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error. Please try again later.',
        });
    }
}

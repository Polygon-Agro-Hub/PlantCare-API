const asyncHandler = require("express-async-handler");
const staffDao = require("../dao/staff-dao");
const { createStaffMember } = require('../validations/farm-validation');


exports.getFarmById = asyncHandler(async (req, res) => {
    try {
        const farmId = req.params.id;
        const userId = req.user.id;

        const farmData = await staffDao.getFarmByIdWithStaff(farmId, userId);

        if (!farmData) {
            return res.status(404).json({ message: "Farm not found" });
        }

        res.status(200).json(farmData);
    } catch (error) {
        console.error("Error fetching farm:", error);
        res.status(500).json({ message: "Failed to fetch farm" });
    }
});


exports.CreateNewStaffMember = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.ownerId;
        const { farmId } = req.params;

        const input = {
            ...req.body,
            farmId 
        };

        const { value, error } = createStaffMember.validate(input);
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }


        const {
            firstName,
            lastName,
            phoneNumber,
            countryCode,
            role,
            nic
        } = value;

        // Create staff member
        const result = await staffDao.CreateStaffMember({
            userId,
            farmId,
            firstName,
            lastName,
            phoneNumber,
            countryCode,
            role,
            nic
        });


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
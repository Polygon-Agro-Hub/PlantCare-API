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
    console.log('Staff member creation request:', req.body);
    try {
        const userId = req.user.ownerId;
        const { farmId } = req.params; // Get farmId from URL params
        console.log('User ID:', userId, 'Farm ID:', farmId);

        // Create input object for validation
        const input = {
            ...req.body,
            farmId // Include farmId in input for validation
        };

        // Validate input (you'll need to create/update your validation schema)
        const { value, error } = createStaffMember.validate(input); // Note: changed from createFarm
        if (error) {
            return res.status(400).json({
                status: "error",
                message: error.details[0].message,
            });
        }

        console.log("Validated input:", value);

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

        console.log("Staff member creation result:", result);

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
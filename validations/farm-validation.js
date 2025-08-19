const Joi = require('joi');

const createFarm = Joi.object({
    // User ID added by middleware
    userId: Joi.number().required(),

    // Basic farm details
    farmName: Joi.string().required(),
    farmIndex: Joi.number().optional().default(1), // Uncommented this line
    farmImage: Joi.number().optional().default(1),

    // Extent details
    extentha: Joi.string().required(),
    extentac: Joi.string().required(),
    extentp: Joi.string().required(),

    // Location details
    district: Joi.string().required(),
    plotNo: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),

    // Staff details
    staffCount: Joi.string().required(),
    appUserCount: Joi.string().required(),

    // Staff array
    staff: Joi.array()
        .items(
            Joi.object({
                id: Joi.number().optional(),
                firstName: Joi.string().required(),
                lastName: Joi.string().required(),
                phoneCode: Joi.string().required(),
                phoneNumber: Joi.string().required(),
                role: Joi.string().required(),
                nic: Joi.string().required(),
                image: Joi.string().allow(null).optional(),
            })
        )
        .required(),
});

const createPayment = Joi.object({
    userId: Joi.number().integer().positive().required(),
    payment: Joi.number().positive().required(),
    plan: Joi.string().valid('1month', '3months', '6months', '12months').required(),
    expireDate: Joi.date().iso().required(),
    activeStatus: Joi.number().valid(0, 1).default(1)
});


const updateFarm = Joi.object({
    // User ID added by middleware
    userId: Joi.number().required(),

    // Basic farm details
    farmId: Joi.number().required(),
    farmName: Joi.string().required(),
    farmIndex: Joi.number().optional().default(1), // Uncommented this line
    farmImage: Joi.number().optional().default(1),

    // Extent details
    extentha: Joi.string().required(),
    extentac: Joi.string().required(),
    extentp: Joi.string().required(),

    // Location details
    district: Joi.string().required(),
    plotNo: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),

    // Staff details
    staffCount: Joi.string().required(),

});

const createStaffMember = Joi.object({
    farmId: Joi.number().integer().positive().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phoneNumber: Joi.string().pattern(/^\d{7,15}$/).required(),
    countryCode: Joi.string().pattern(/^\+\d{1,4}$/).required(),
    role: Joi.string().required(),
});

exports.ongoingCultivationSchema = Joi.object({
    limit: Joi.number().optional(), // For pagination, optional
    offset: Joi.number().optional(), // For pagination, optional
});


const enrollSchema = Joi.object({
    ongoingCultivationId: Joi.number().integer().positive().allow(null).messages({
        "number.base": `"Ongoing Cultivation ID" should be a number`,
        "number.integer": `"Ongoing Cultivation ID" should be an integer`,
        "number.positive": `"Ongoing Cultivation ID" should be a positive number`,
    }),
    startedAt: Joi.date().iso().allow(null).messages({
        "date.base": `"Started At" should be a valid date`,
        "date.format": `"Started At" should follow the ISO 8601 format`,
    }),
    // Fixed: Removed .integer() since extent can have decimal places
    extentha: Joi.number().precision(2).min(0).required().messages({
        "number.base": `"Extent HA" should be a number`,
        "number.precision": `"Extent HA" should have up to 2 decimal places`,
        "number.min": `"Extent HA" should be non-negative`,
        "any.required": `"Extent HA" is required`,
    }),
    extentac: Joi.number().precision(2).min(0).required().messages({
        "number.base": `"Extent AC" should be a number`,
        "number.precision": `"Extent AC" should have up to 2 decimal places`,
        "number.min": `"Extent AC" should be non-negative`,
        "any.required": `"Extent AC" is required`,
    }),
    extentp: Joi.number().precision(2).min(0).required().messages({
        "number.base": `"Extent P" should be a number`,
        "number.precision": `"Extent P" should have up to 2 decimal places`,
        "number.min": `"Extent P" should be non-negative`,
        "any.required": `"Extent P" is required`,
    }),
    createdAt: Joi.date().timestamp().default(() => new Date()).messages({
        "date.base": `"Created At" should be a valid timestamp`,
    }),
    farmId: Joi.number().integer().positive().required().messages({
        "number.base": `"Farm ID" should be a number`,
        "number.integer": `"Farm ID" should be an integer`,
        "number.positive": `"Farm ID" should be a positive number`,
        "any.required": `"Farm ID" is required`,
    }),
});


exports.signupCheckerSchema = Joi.object({
    phoneNumber: Joi.string()
        .pattern(/^\+?\d{10,15}$/)
        .optional()
        .label('Phone Number')
        .messages({
            "string.pattern.base": "Phone number must be a valid format with 10-15 digits."
        }),

});

const getSlaveCropCalendarDaysSchema = Joi.object({
    cropCalendarId: Joi.number().integer().required(),
    farmId: Joi.number().integer().required()
});


// Export both schemas in a single module.exports
module.exports = {
    createFarm,
    createPayment,
    enrollSchema,
    signupCheckerSchema: exports.signupCheckerSchema,
    updateFarm,
    createStaffMember,
    getSlaveCropCalendarDaysSchema
};
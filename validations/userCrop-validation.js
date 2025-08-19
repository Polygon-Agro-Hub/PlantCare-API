const Joi = require("joi");

// Validation schema for getting crop by category
exports.getCropByCategorySchema = Joi.object({
    categorie: Joi.string().required().label("Category"),
});

// Validator to ensure cropId is a number and is required
exports.getCropByIdSchema = Joi.object({
    id: Joi.number().required().label("Crop ID"),
});

// Validate cropId from URL parameters
exports.cropCalendarFeedSchema = Joi.object({
    cropid: Joi.string().required().messages({
        "string.base": `"Crop ID" should be a type of 'text'`,
        "string.empty": `"Crop ID" cannot be an empty field`,
        "any.required": `"Crop ID" is required`,
    }),
});

// You can use this if you need to validate query parameters, such as pagination.
exports.ongoingCultivationSchema = Joi.object({
    limit: Joi.number().optional(), // For pagination, optional
    offset: Joi.number().optional(), // For pagination, optional
});

exports.enrollSchema = Joi.object({
    ongoingCultivationId: Joi.number().integer().positive().allow(null).messages({
        "number.base": `"Ongoing Cultivation ID" should be a number`,
        "number.integer": `"Ongoing Cultivation ID" should be an integer`,
        "number.positive": `"Ongoing Cultivation ID" should be a positive number`,
    }),
    startedAt: Joi.date().iso().allow(null).messages({
        "date.base": `"Started At" should be a valid date`,
        "date.format": `"Started At" should follow the ISO 8601 format`,
    }),
    extentha: Joi.number().precision(2).integer().required().messages({
        "number.base": `"Extent" should be a number`,
        "number.precision": `"Extent" should have up to 2 decimal places`,
        "number.integer": `"Ongoing Cultivation ID" should be an integer`,
        "any.required": `"Extent" is required`,
    }),
    extentac: Joi.number().precision(2).integer().required().messages({
        "number.base": `"Extent" should be a number`,
        "number.precision": `"Extent" should have up to 2 decimal places`,
        "number.integer": `"Ongoing Cultivation ID" should be an integer`,
        "any.required": `"Extent" is required`,
    }),
    extentp: Joi.number().precision(2).integer().required().messages({
        "number.base": `"Extent" should be a number`,
        "number.precision": `"Extent" should have up to 2 decimal places`,
        "number.integer": `"Ongoing Cultivation ID" should be an integer`,
        "any.required": `"Extent" is required`,
    }),
    createdAt: Joi.date().timestamp().default(() => new Date()).messages({
        "date.base": `"Created At" should be a valid timestamp`,
    }),
});

exports.getSlaveCropCalendarDaysSchema = Joi.object({
    cropCalendarId: Joi.string().required().label("Crop Calendar ID"),
    farmId: Joi.number().integer().required()
});

exports.updateCropCalendarStatusSchema = Joi.object({
    id: Joi.number().required().label("Task ID"),
    status: Joi.string().valid("pending", "completed").required().label("Status"),
});

// module.exports = {
//   ongoingCultivationSchema,
// };
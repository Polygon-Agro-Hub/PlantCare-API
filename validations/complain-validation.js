const Joi = require("joi");

exports.createComplain = Joi.object({
    language: Joi.string().required().messages({
        "string.empty": "Language is required.",
    }),
    complain: Joi.string().required().messages({
        "string.empty": "Complain description is required.",
    }),
    category: Joi.string().required().messages({
        "string.empty": "Category is required.",
    }),
    farmerId: Joi.number().integer().required().messages({
        "number.base": "Farmer ID must be a number.",
        "any.required": "Farmer ID is required.",
    }),
});

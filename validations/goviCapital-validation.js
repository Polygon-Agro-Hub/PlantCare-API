const Joi = require('joi');

// Simple validation for investment request
exports.createInvestmentRequestSchema = Joi.object({
    cropId: Joi.number().required(),
    extentha: Joi.number().required(),
    extentac: Joi.number().required(),
    extentp: Joi.number().required(),
    investment: Joi.number().required(),
    expectedYield: Joi.number().required(),
    startDate: Joi.date().required(),
    plotNumber: Joi.string().required(),
    streetName: Joi.string().required(),
    landCity: Joi.string().required()
});
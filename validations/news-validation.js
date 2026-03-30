const Joi = require("joi");

exports.getAllNewsSchema = Joi.object({});

exports.getNewsByIdSchema = Joi.object({
  newsId: Joi.number().required().messages({
    "number.base": `"News ID" should be a type of 'number'`,
    "number.empty": `"News ID" cannot be an empty field`,
    "any.required": `"News ID" is required`,
  }),
});

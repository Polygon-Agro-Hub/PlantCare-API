const Joi = require("joi");

exports.loginUserSchema = Joi.object({
  phonenumber: Joi.string()
    .pattern(/^\+?\d{10,15}$/)
    .required()
    .label("Phone number")
    .messages({
      "string.pattern.base":
        "Phone number must be a valid format with 10-15 digits.",
    }),
});

exports.signupUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().label("First Name"),
  lastName: Joi.string().min(2).max(50).required().label("Last Name"),
  phoneNumber: Joi.number().required().label("Mobile Number"),
  NICnumber: Joi.string()
    .min(9)
    .max(12)
    .required()
    .label("NIC Number")
    .messages({
      "string.min": "NIC Number must be at least 9 characters.",
      "string.max": "NIC Number must be no more than 12 characters.",
    }),
  district: Joi.string().required().label("District"),
  farmerLanguage: Joi.string(),
});

exports.updatePhoneNumberSchema = Joi.object({
  newPhoneNumber: Joi.string()
    .pattern(/^\+?\d{10,15}$/)
    .required()
    .label("New Phone Number")
    .messages({
      "string.pattern.base":
        "New phone number must be a valid format with 10-15 digits.",
    }),
});

exports.signupCheckerSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?\d{10,15}$/)
    .optional()
    .label("Phone Number")
    .messages({
      "string.pattern.base":
        "Phone number must be a valid format with 10-15 digits.",
    }),
  NICnumber: Joi.string().optional().label("NIC Number"),
})
  .or("phoneNumber", "NICnumber")
  .label("Request Data")
  .messages({
    "object.missing":
      "Please provide at least one of phoneNumber or NICnumber.",
  });

exports.updateFirstLastNameSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().label("First Name"),
  lastName: Joi.string().min(2).max(50).required().label("Last Name"),
  streetname: Joi.string()
    .max(50)
    .allow(null, "")
    .optional()
    .label("Street Name"), 
  city: Joi.string().max(50).allow(null, "").optional().label("City Name"),
  district: Joi.string()
    .max(50)
    .allow(null, "")
    .optional()
    .label("District Name"),
  buidingname: Joi.string()
    .max(50)
    .allow(null, "")
    .optional()
    .label("Building Name"), 
});

exports.updateAddressSchema = Joi.object({
  houseNo: Joi.string().min(1).required().messages({
    "string.base": "House number must be a string",
    "string.empty": "House number cannot be empty",
    "any.required": "House number is required",
  }),
  streetName: Joi.string().min(1).required().messages({
    "string.base": "Street name must be a string",
    "string.empty": "Street name cannot be empty",
    "any.required": "Street name is required",
  }),
  city: Joi.string().min(1).required().messages({
    "string.base": "City must be a string",
    "string.empty": "City cannot be empty",
    "any.required": "City is required",
  }),
});

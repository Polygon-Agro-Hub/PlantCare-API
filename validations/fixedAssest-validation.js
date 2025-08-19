// // validators/fixedAssets-validation.js
// const Joi = require("joi");

// // Validation schema for fetching fixed assets by category and user
// exports.fixedAssetsSchema = Joi.object({
//   category: Joi.string().required().label("Category"),
// });

// // Validation schema for deleting fixed assets
// exports.deleteFixedAssetSchema = Joi.object({
//   ids: Joi.alternatives()
//     .try(
//       Joi.array().items(Joi.number().integer().required()),
//       Joi.number().integer()
//     )
//     .required()
//     .label("IDs"),
// });

const Joi = require("joi");

// Validation schema for fetching fixed assets by category and user
exports.fixedAssetsSchema = Joi.object({
    category: Joi.string().required().label("Category"),
});

// Validation schema for deleting fixed assets
exports.deleteFixedAssetSchema = Joi.object({
    ids: Joi.alternatives()
        .try(
            Joi.array().items(Joi.number().integer().required()),
            Joi.number().integer()
        )
        .required()
        .label("IDs"),
});



exports.addFixedAssetSchema = Joi.object({
    asset: Joi.string().allow('').label("Asset"),
    farmId: Joi.number(),
    assetType: Joi.string().allow('').label("Asset Type"),
    assetname: Joi.string().allow('').label("Asset Name"),
    brand: Joi.string().allow('').label("Brand"),
    category: Joi.string().valid('Building and Infrastructures', 'Land', 'Machine and Vehicles', 'Tools').allow('').label("Category"),
    district: Joi.string().allow('').label("District"),
    durationMonths: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Duration in Months"),
    durationYears: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Duration in Years"),
    estimateValue: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Estimated Value"),
    expireDate: Joi.date().allow(null).label("Expire Date"),
    extentac: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Extent (ac)"),
    extentha: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Extent (ha)"),
    extentp: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Extent (p)"),
    floorArea: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Floor Area"),
    generalCondition: Joi.string().allow('').label("General Condition"),
    issuedDate: Joi.date().allow(null).label("Issued Date"),
    landFenced: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("yes", "no").allow('')).label("Land Fenced"),
    leastAmountAnnually: Joi.alternatives().try(Joi.number(), Joi.string().allow(''))
        .label("Lease Amount Annually")
        .custom((value, helpers) => {
            console.log('Lease Amount Annually:', value);
            return value;
        }),
    mentionOther: Joi.string().allow('').label("Other Mentions"),
    numberOfUnits: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).label("Number of Units"),
    ownership: Joi.string().allow('').label("Ownership"),
    paymentAnnually: Joi.alternatives().try(Joi.number(), Joi.string().allow(''))
        .label("Payment Annually")
        .custom((value, helpers) => {
            console.log('Payment Annually:', value);
            return value;
        }),
    perennialCrop: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("yes", "no").allow('')).label("Perennial Crop"),
    permitFeeAnnually: Joi.alternatives().try(Joi.number(), Joi.string().allow(''))
        .label("Permit Fee Annually")
        .custom((value, helpers) => {
            console.log('Permit Fee Annually:', value);
            return value;
        }),
    purchaseDate: Joi.date().allow(null).label("Purchase Date"),
    startDate: Joi.date().allow(null).label("Start Date"),
    toolbrand: Joi.string().allow('').label("Tool Brand"),
    totalPrice: Joi.number().allow(null)
        .label("Total Price")
        .custom((value, helpers) => {
            console.log('Total Price:', value);
            return value;
        }),
    type: Joi.string().allow('').label("Type"),
    unitPrice: Joi.alternatives().try(Joi.number(), Joi.string().allow(''))
        .label("Unit Price")
        .custom((value, helpers) => {
            console.log('Unit Price:', value);
            return value;
        }),
    warranty: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("yes", "no").allow('')).label("Warranty"),
    landownership: Joi.string().allow('').label("Landownership"),
    warrantystatus: Joi.array().items(
        Joi.object({
            key: Joi.string().allow(''),
            value: Joi.alternatives().try(Joi.boolean(), Joi.string().valid("yes", "no").allow(''))
        })
    ).label("Warranty Status")
});
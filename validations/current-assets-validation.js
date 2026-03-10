const Joi = require("joi");

exports.getAllCurrentAssetsSchema = Joi.object({
  userId: Joi.number().integer().required().label("User ID"),
});

exports.getAssetsByCategorySchema = Joi.object({
  category: Joi.alternatives()
    .try(
      Joi.string().label("Category"),
      Joi.array().items(Joi.string().label("Category")),
    )
    .required()
    .label("Category"),
});

exports.deleteAssetSchema = Joi.object({
  numberOfUnits: Joi.number()
    .integer()
    .positive()
    .required()
    .label("Number of Units"),
  totalPrice: Joi.number().positive().required().label("Total Price"),
});

exports.deleteAssetParamsSchema = Joi.object({
  category: Joi.string().required().label("Category"),
  assetId: Joi.number().integer().required().label("Asset ID"),
});

exports.addCurrectAssetSchema = Joi.object({
  category: Joi.string().required().label("Category"),
  asset: Joi.string().required().label("Asset"),
  farmId: Joi.number().integer().optional().label("Farm ID"),
  brand: Joi.string().optional().label("Brand"),
  batchNum: Joi.string().optional().label("Batch Number"),
  volume: Joi.number().positive().required(),
  unit: Joi.string().required().label("Unit"),
  numberOfUnits: Joi.number().integer().required().label("Number of Units"),
  unitPrice: Joi.number().precision(2).required().label("Unit Price"),
  totalPrice: Joi.number()
    .precision(2)
    .required()
    .label("Total Price")
    .custom((value, helpers) => {
      console.log("Total Price:", value);
      return value;
    }),
  purchaseDate: Joi.date().required().label("Purchase Date"),
  expireDate: Joi.date().optional().label("Expire Date"),
  warranty: Joi.string().optional().label("Warranty"),
  status: Joi.string().optional().label("Status"),
});

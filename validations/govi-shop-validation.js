const Joi = require("joi");

exports.upsertCartItemSchema = Joi.object({
  branchId: Joi.number().integer().positive().required(),
  productId: Joi.number().integer().positive().required(),
  subProdId: Joi.number().integer().positive().allow(null).optional(),
  subProdColorId: Joi.number().integer().positive().allow(null).optional(),
  equipColorId: Joi.number().integer().positive().allow(null).optional(),
  qty: Joi.number().integer().min(0).required(),
});

exports.removeCartItemSchema = Joi.object({
  branchId: Joi.number().integer().positive().required(),
  productId: Joi.number().integer().positive().required(),
  subProdId: Joi.number().integer().positive().allow(null).optional(),
  subProdColorId: Joi.number().integer().positive().allow(null).optional(),
  equipColorId: Joi.number().integer().positive().allow(null).optional(),
});

exports.getBranchProductsQuerySchema = Joi.object({
  categoryId: Joi.number().integer().positive().allow(null, "").optional(),
  search: Joi.string().trim().max(100).allow("").optional(),
});

exports.getProductVariantsQuerySchema = Joi.object({
  branchId: Joi.number().integer().positive().required(),
});

exports.placeOrderSchema = Joi.object({
  branchId: Joi.number().integer().positive().required(),
});

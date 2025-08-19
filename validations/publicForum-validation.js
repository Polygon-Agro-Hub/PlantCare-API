const Joi = require("joi");

//get all posts
exports.getPostsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).label("Page"),
  limit: Joi.number().integer().min(1).default(10).label("Limit"),
});

exports.getRepliesSchema = Joi.object({
  chatId: Joi.number().integer().required().label("Chat ID"),
});

// Validation for creating a reply
exports.createReplySchema = Joi.object({
  chatId: Joi.number().integer().required().label("Chat ID"),
  replyMessage: Joi.string().required().label("Reply Message"),
  replyId: Joi.any().optional(),
});

// Validation for creating a post
exports.createPostSchema = Joi.object({
  heading: Joi.string().required().label("Heading"),
  message: Joi.string().required().label("Message"),
});

exports.updatepostschema = Joi.object({
   heading: Joi.string().required().label("Heading"),
  message: Joi.string().required().label("Message"),
prepostimage: Joi.string().allow(null, '').label("prepostimage")
})
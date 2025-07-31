const asyncHandler = require("express-async-handler");

const {
  getPostsSchema,
  getRepliesSchema,
  createReplySchema,
  createPostSchema,
  updatepostschema
} = require("../validations/publicForum-validation");
const postsDao = require("../dao/publicForum-dao");
const uploadFileToS3 = require('../Middlewares/s3upload')
const delectfilesOnS3 = require('../Middlewares/s3delete');

exports.getPosts = asyncHandler(async (req, res) => {
  try {
    const { page, limit } = await getPostsSchema.validateAsync(req.query);
    const offset = (page - 1) * limit;

    const posts = await postsDao.getPaginatedPosts(limit, offset);

    const totalPosts = await postsDao.getTotalPostsCount();

    res.status(200).json({
      total: totalPosts,
      posts,
    });
  } catch (err) {
    console.error("Error fetching posts:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

exports.getReplies = asyncHandler(async (req, res) => {
  try {
    const { chatId } = await getRepliesSchema.validateAsync(req.params);

    const replies = await postsDao.getRepliesByChatId(chatId);

    res.status(200).json(replies);
  } catch (err) {
    console.error("Error fetching replies:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

exports.createReply = asyncHandler(async (req, res) => {
  try {
    const { chatId, replyMessage } = await createReplySchema.validateAsync(
      req.body
    );
    const replyId = req.user.ownerId;
    const userId = req.user.id;
    const role = req.user.role
    const newReplyId = await postsDao.createReply(
      chatId,
      replyId,
      replyMessage,
      userId,
      role
    );

    res.status(201).json({ message: "Reply created", replyId: newReplyId });
  } catch (err) {
    console.error("Error creating reply:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

exports.createPost = asyncHandler(async (req, res) => {
  try {
    const { heading, message } = await createPostSchema.validateAsync(req.body);
    const userId = req.user.id;
    const ownerId = req.user.ownerId;
    const role = req.user.role

    let postimage = null;

    if (req.file) {
      const fileName = req.file.originalname;
      const imageBuffer = req.file.buffer
      const image = await uploadFileToS3(imageBuffer, fileName, `plantcareuser/owner${ownerId}/user${userId}`);
      postimage = image;
    } else {
    }

    const newPostId = await postsDao.createPost(
      userId,
      heading,
      message,
      postimage,
      ownerId,
      role
    );

    res.status(201).json({ message: "Post created", postId: newPostId });
  } catch (err) {
    console.error("Error creating post:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

// exports.deletePost = asyncHandler(async (req, res) => {
//   console.log("Deleting post...");
//   console.log("Request params:", req.params);
//   console.log("Req body:", req.body);
//   try {
//     const { postId } = req.params;
//     await postsDao.deletePost(postId);
//       await delectfilesOnS3(req.body.postImage);
//     res.status(200).json({ message: "Post deleted successfully" });

//   } catch (err) {
//     console.error("Error deleting post:", err);

//     if (err.isJoi) {
//       return res.status(400).json({
//         status: "error",
//         message: err.details[0].message,
//       });
//     }

//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


exports.deletePost = asyncHandler(async (req, res) => {
  console.log("Deleting post...");
  console.log("Request params:", req.params);
  console.log("Req body:", req.body);
  try {
    const { postId } = req.params;
    await postsDao.deletePost(postId);

    // Only try to delete the image if postImage exists and is not empty
    if (req.body.postImage) {
      await delectfilesOnS3(req.body.postImage);
    }

    res.status(200).json({ message: "Post deleted successfully" });

  } catch (err) {
    console.error("Error deleting post:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

exports.getPostbyId = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  try {
    const result = await postsDao.getPostbyId(postId);
    res.status(200).json(result)
  } catch {

  }
})

exports.updatepost = asyncHandler(async (req, res) => {
  console.log("hittttttt update post by id")

  const { postId } = req.params;
  console.log(postId, req.body)

  const { heading, message, prepostimage } = await updatepostschema.validateAsync(req.body);
  const userId = req.user.id;
  const ownerId = req.user.ownerId;

  let postimage = null;

  if (prepostimage) {
    await delectfilesOnS3(req.body.prepostimage);
  }
  if (req.file) {
    const fileName = req.file.originalname;
    const imageBuffer = req.file.buffer
    const image = await uploadFileToS3(imageBuffer, fileName, `plantcareuser/owner${ownerId}/user${userId}`);
    postimage = image;
  } else {
  }

  const update = await postsDao.updatePost(
    postId,
    heading,
    message,
    postimage
  );

  res.status(200).json({ message: "Post update succuess" });
})




exports.EditReply = asyncHandler(async (req, res) => {
  try {
    const { editingCommentId } = req.params;
    const { replyMessage } = req.body;


    if (!replyMessage || !editingCommentId) {
      return res.status(400).json({
        status: "error",
        message: "Reply message and comment ID are required"
      });
    }



    // Update the reply
    const updatedReply = await postsDao.editReply(editingCommentId, replyMessage);

    if (!updatedReply) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Reply updated successfully",
      data: updatedReply
    });
  } catch (err) {
    console.error("Error editing reply:", err);

    if (err.isJoi) {
      return res.status(400).json({
        status: "error",
        message: err.details[0].message,
      });
    }

    res.status(500).json({
      status: "error",
      error: "Internal Server Error"
    });
  }
});

exports.deleteReply = asyncHandler(async (req, res) => {
  console.log("Deleting Reply...");
  try {
    const { commentId } = req.params; // Get commentId from URL params



    // Delete the reply
    const isDeleted = await postsDao.deleteReply(commentId);

    if (!isDeleted) {
      return res.status(404).json({
        status: "error",
        message: "Reply not found or already deleted"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Reply deleted successfully"
    });

  } catch (err) {
    console.error("Error deleting reply:", err);
    res.status(500).json({
      status: "error",
      error: "Internal Server Error"
    });
  }
});
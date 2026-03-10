const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/multer.middleware");
const postsEp = require("../end-point/public-forum-ep");

router.get(
    "/get", 
    postsEp.getPosts
);

router.get(
    "/get/:chatId", 
    postsEp.getReplies
);

router.post(
    "/add/reply", 
    authenticate, 
    postsEp.createReply
);

router.post(
    "/add/post", 
    authenticate, 
    upload.single("postimage"), 
    postsEp.createPost
);

router.delete(
    "/delete/:postId", 
    authenticate, 
    postsEp.deletePost
);

router.get(
    "/getpost/:postId", 
    postsEp.getPostbyId
);

router.put(
    "/updatepost/:postId",
    authenticate,
    upload.single("postimage"),
    postsEp.updatepost,
);

router.put(
    "/update/reply/:editingCommentId", 
    authenticate, 
    postsEp.EditReply
);

router.delete(
    "/delete/reply/:commentId", 
    authenticate, 
    postsEp.deleteReply
);

module.exports = router;

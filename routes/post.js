const isAuth = require("./auth");
const router = require("express").Router();
const Post = require("../models/post.js");
const Comment = require("../models/comment.js");
const handleErrorAsync = require("../utils/handleErrorAsync");

router.get(
  "/:id",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const post = await Post.findById(req.params.id).populate("comments");
    res.status(200).json({
      status: "success",
      data: post,
    });
  })
);

router.get("/", async function (req, res, next) {
  const posts = await Post.find({}).populate("comments");
  res.status(200).json({
    status: "success",
    data: posts,
  });
});

router.post(
  "/",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const data = req.body;
    if (data.content) {
      const newPost = await Post.create({
        user: req.user.id,
        content: data.content,
        tags: data.tags,
        type: data.type,
      });
      res.status(200).json({
        status: "success",
        data: newPost,
      });
    } else {
      res.status(400).json({
        status: "false",
        message: "欄位未填寫正確，或無此 todo ID",
      });
    }
  })
);

// 新增按讚
router.post(
  "/:id/likes",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    await Post.findByIdAndUpdate(req.params.id, {
      $addToSet: { likes: req.user.id },
    });

    res.status(201).json({
      status: "success",
      postId: req.params.id,
      userId: req.user.id,
    });
  })
);

// 移除按讚
router.delete(
  "/:id/likes",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    await Post.findByIdAndUpdate(req.params.id, {
      $pull: { likes: req.user.id },
    });

    res.status(201).json({
      status: "success",
      postId: req.params.id,
      userId: req.user.id,
    });
  })
);

// 新增留言
router.post(
  "/:id/comment",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const user = req.user.id;
    const post = req.params.id;
    const { comment } = req.body;
    const newComment = await Comment.create({
      post,
      user,
      comment,
    });
    res.status(201).json({
      status: "success",
      data: {
        comments: newComment,
      },
    });
  })
);

module.exports = router;

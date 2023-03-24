const bcrypt = require("bcrypt");
const validator = require("validator");
const User = require("../models/user");
const Post = require("../models/post");
const jwt = require("jsonwebtoken");
const router = require("express").Router();
const appError = require("../utils/appError");
const handleErrorAsync = require("../utils/handleErrorAsync");
const isAuth = require("./auth");

// 產生 JWT token
const generateJWT = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_IN,
  });
};

router.post(
  "/sign_up",
  handleErrorAsync(async (req, res, next) => {
    let { email, password, confirmPassword, name } = req.body;
    // 內容不可為空
    if (!email || !password || !confirmPassword || !name) {
      return next(new appError("欄位未填寫正確！", 400));
    }
    // 密碼正確
    if (password !== confirmPassword) {
      return next(new appError("密碼不一致！", 400));
    }
    // 密碼 8 碼以上
    if (!validator.isLength(password, { min: 8 })) {
      return next(new appError("密碼字數低於 8 碼", 400));
    }
    // 是否為 Email
    if (!validator.isEmail(email)) {
      return next(new appError("Email 格式不正確", 400));
    }

    // 加密密碼
    password = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      email,
      password,
      name,
    });

    // 產生 JWT
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE_IN,
    });

    // 將 token 回傳至 client
    res.status(200).json({
      status: "success",
      user: {
        token,
        name: newUser.name,
      },
    });
  })
);

router.post(
  "/sign_in",
  handleErrorAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new appError("帳號密碼不可為空", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new appError("帳號或密碼錯誤，請重新輸入！", 400));
    }

    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return next(new appError("您的密碼不正確", 400));
    }

    const token = generateJWT(user._id);
    delete user.password;
    res.status(200).json({
      status: "success",
      user: {
        token,
        name: user.name,
      },
    });
  })
);

// routes/users
router.get(
  "/profile",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    req.user.password = undefined;
    res.status(200).json({
      status: "success",
      user: req.user,
    });
  })
);

router.post(
  "/updatePassword",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    let { password, confirmPassword, newPassword } = req.body;

    // 內容不可為空
    if (!password || !confirmPassword) {
      return next(new appError("欄位未填寫正確！", 400));
    }
    // 密碼正確
    if (password !== confirmPassword) {
      return next(new appError("密碼不一致！", 400));
    }
    // 密碼 8 碼以上
    if (!validator.isLength(newPassword, { min: 8 })) {
      return next(new appError("密碼字數低於 8 碼", 400));
    }

    // 比對密碼
    const user = await User.findById(req.user.id).select("+password");
    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return next(new appError("原密碼不正確", 400));
    }

    // 加密密碼
    password = await bcrypt.hash(newPassword, 12);

    // 更新密碼
    const newUser = await User.findByIdAndUpdate(req.user.id, {
      password,
    });

    // 產生 JWT
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE_IN,
    });

    // 將 token 回傳至 client
    res.status(200).json({
      status: "success",
      user: {
        token,
        name: newUser.name,
      },
    });
  })
);

router.get(
  "/getLikeList",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const likeList = await Post.find({
      likes: { $in: [req.user.id] },
    })
      .populate({
        path: "user",
        select: "name _id",
      })
      .populate({
        path: "likes",
        select: "name _id",
      });

    res.status(200).json({
      status: "success",
      likeList,
    });
  })
);

router.post(
  "/:id/follow",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    if (req.params.id === req.user.id) {
      return next(new appError("您無法追蹤自己", 401));
    }
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { following: req.params.id },
    });
    await User.findByIdAndUpdate(req.params.id, {
      $addToSet: { followers: req.user.id },
    });
    res.status(200).json({
      status: "success",
      message: "您已成功追蹤！",
    });
  })
);

router.delete(
  "/:id/unfollow",
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    if (req.params.id === req.user.id) {
      return next(new appError("您無法取消追蹤自己", 401));
    }
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { following: req.params.id },
    });
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { followers: req.user.id },
    });
    res.status(200).json({
      status: "success",
      message: "您已成功取消追蹤！",
    });
  })
);

module.exports = router;

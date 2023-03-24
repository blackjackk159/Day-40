const User = require("../models/user");
const jwt = require("jsonwebtoken");
const appError = require("../utils/appError");
const handleErrorAsync = require("../utils/handleErrorAsync");

// isAuth middleware
const isAuth = handleErrorAsync(async (req, res, next) => {
  // 確認 token 是否存在
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new appError(401, "你尚未登入！", next));
  }

  // 驗證 token 正確性
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  req.user = currentUser;
  next();
});

module.exports = isAuth;

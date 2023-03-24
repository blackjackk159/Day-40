const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  comment: String,
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: "Post",
  },
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;


const mongoose = require('mongoose')

const postSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Post', postSchema)


const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    subscription: {
      type: String,
      enum: ['Free', 'Bronze', 'Silver', 'Gold'],
      default: 'Free',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', userSchema)

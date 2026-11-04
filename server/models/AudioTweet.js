const mongoose = require('mongoose');

const audioTweetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 100 * 1024 * 1024,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
      max: 300,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AudioTweet', audioTweetSchema);
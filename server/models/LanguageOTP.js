const mongoose = require('mongoose')

const languageOTPSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    language: {
      type: String,
      enum: ['English', 'Spanish', 'Hindi', 'Portuguese', 'Chinese', 'French'],
      required: true,
    },

    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
)

languageOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('LanguageOTP', languageOTPSchema)
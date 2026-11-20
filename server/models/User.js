
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

    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid mobile number'],
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    preferredLanguage: {
      type: String,
      enum: ['English', 'Spanish', 'Hindi', 'Portuguese', 'Chinese', 'French'],
      default: 'English',
    },

    // Browser notification preference
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },

    subscription: {
      type: String,
      enum: ['Free', 'Bronze', 'Silver', 'Gold'],
      default: 'Free',
    },

    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },

    passwordResetRequestedAt: {
      type: Date,
      default: null,
    },
    mustChangePassword: {
  type: Boolean,
  default: false,
},
  },
  { timestamps: true }
)

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: 'string' },
    },
  }
)

module.exports = mongoose.model('User', userSchema)

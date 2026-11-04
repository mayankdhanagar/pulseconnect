
const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    browser: {
      type: String,
      required: true,
    },
    operatingSystem: {
      type: String,
      required: true,
    },
    deviceCategory: {
      type: String,
      enum: ["Mobile", "Tablet", "Desktop/Laptop", "Unknown"],
      required: true,
    },
    ipAddress: {
      type: String,
      default: "Unknown",
    },
    loggedInAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

loginHistorySchema.index({ user: 1, loggedInAt: -1 });

module.exports = mongoose.model("LoginHistory", loginHistorySchema);

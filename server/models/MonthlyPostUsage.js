const mongoose = require('mongoose')

const monthlyPostUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    monthKey: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
)

monthlyPostUsageSchema.index(
  { user: 1, monthKey: 1 },
  { unique: true }
)

module.exports = mongoose.model(
  'MonthlyPostUsage',
  monthlyPostUsageSchema
)
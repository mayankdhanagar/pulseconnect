
const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    txnid: {
      type: String,
      required: true,
      unique: true,
    },

    plan: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Success', 'Failed'],
      default: 'Pending',
    },

    payuPaymentId: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    processingAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Payment', paymentSchema)

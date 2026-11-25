
const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const User = require('../models/User')
const Payment = require('../models/Payment')

const router = express.Router()

const PLANS = {
  Bronze: {
    amount: 100,
    description: 'PulseConnect Bronze Monthly Subscription',
  },
  Silver: {
    amount: 300,
    description: 'PulseConnect Silver Monthly Subscription',
  },
  Gold: {
    amount: 1000,
    description: 'PulseConnect Gold Monthly Subscription',
  },
}

const SUBSCRIPTION_DAYS = 30
const PROCESSING_TIMEOUT = 5 * 60 * 1000

function sha512(value) {
  return crypto.createHash('sha512').update(value).digest('hex')
}

function isValidHash(receivedHash, calculatedHash) {
  if (
    typeof receivedHash !== 'string' ||
    !/^[a-f0-9]{128}$/i.test(receivedHash)
  ) {
    return false
  }

  const received = Buffer.from(receivedHash, 'hex')
  const calculated = Buffer.from(calculatedHash, 'hex')

  return (
    received.length === calculated.length &&
    crypto.timingSafeEqual(received, calculated)
  )
}


// Payment time restriction: 10:00 AM to 10:59 AM IST in every environment.

function isPaymentTimeAllowed(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = Number(
    parts.find((part) => part.type === 'hour').value
  )

  // Allow payments from 10:00 AM until 10:59 AM IST.
  return hour === 10
}


function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token required',
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      })
    }

    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

function getFrontendUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')
}

function getCallbackUrl() {
  const url = process.env.PAYU_CALLBACK_URL

  if (!url || !url.startsWith('https://')) {
    throw new Error('A public HTTPS PAYU_CALLBACK_URL is required')
  }

  return url.replace(/\/$/, '')
}

async function verifyPaymentWithPayU(txnid) {
  const key = process.env.PAYU_KEY
  const salt = process.env.PAYU_SALT
  const baseUrl = process.env.PAYU_BASE_URL

  if (!key || !salt || !baseUrl) {
    throw new Error('PayU configuration is incomplete')
  }

  const command = 'verify_payment'
  const hash = sha512(`${key}|${command}|${txnid}|${salt}`)

  const endpoint = baseUrl.includes('test.payu.in')
    ? 'https://test.payu.in/merchant/postservice.php?form=2'
    : 'https://info.payu.in/merchant/postservice.php?form=2'

  const body = new URLSearchParams({
    key,
    command,
    var1: txnid,
    hash,
  })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`PayU verification HTTP error: ${response.status}`)
  }

  const data = await response.json()

  if (Number(data.status) !== 1) {
    throw new Error(
      `PayU verification unsuccessful: ${data.msg || 'Unknown error'}`
    )
  }

  const transaction = data.transaction_details?.[txnid]

  if (!transaction) {
    throw new Error('Transaction not found in PayU response')
  }

  return transaction
}

async function sendInvoiceEmail(user, payment) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Invoice email skipped: email service is not configured')
    return
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  const paidDate = new Date(payment.paidAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  })

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'PulseConnect Subscription Invoice',
    text: [
      `Hello ${user.name},`,
      '',
      'Your PulseConnect subscription payment was successful.',
      '',
      `Plan: ${payment.plan}`,
      `Amount: INR ${payment.amount}`,
      `Transaction ID: ${payment.txnid}`,
      `PayU Payment ID: ${payment.payuPaymentId || 'Not available'}`,
      `Payment Date: ${paidDate}`,
      'Subscription Duration: 30 days',
      '',
      'Thank you for using PulseConnect.',
    ].join('\n'),
  })
}

// ==========================================
// INITIATE PAYMENT
// ==========================================

router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    if (!process.env.PAYU_KEY || !process.env.PAYU_SALT) {
      return res.status(503).json({
        success: false,
        message: 'PayU credentials are not configured',
      })
    }

    if (!process.env.PAYU_BASE_URL) {
      return res.status(503).json({
        success: false,
        message: 'PAYU_BASE_URL is missing',
      })
    }

    if (!isPaymentTimeAllowed()) {
      return res.status(403).json({
        success: false,
        message: 'Payments are allowed only between 10:00 AM and 11:00 AM IST.',
      })
    }

    const { plan, phone } = req.body

    if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid paid subscription plan',
      })
    }

    if (!/^[6-9]\d{9}$/.test(String(phone || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number',
      })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      })
    }

    const callbackUrl = getCallbackUrl()
    const selectedPlan = PLANS[plan]
    const txnid = `PC${Date.now()}${crypto.randomBytes(4).toString('hex')}`

    const firstName = user.name.trim().split(/\s+/)[0].slice(0, 60)
    const productInfo = selectedPlan.description
    const amount = selectedPlan.amount.toFixed(2)

    const hashString =
      `${process.env.PAYU_KEY}|${txnid}|${amount}|${productInfo}|` +
      `${firstName}|${user.email}|||||||||||${process.env.PAYU_SALT}`

    const hash = sha512(hashString)

    await Payment.create({
      user: user._id,
      txnid,
      plan,
      amount: selectedPlan.amount,
      status: 'Pending',
    })

    const baseUrl = process.env.PAYU_BASE_URL.replace(/\/$/, '')

    return res.json({
      success: true,
      message: 'Payment session created',
      paymentUrl: `${baseUrl}/_payment`,
      fields: {
        key: process.env.PAYU_KEY,
        txnid,
        amount,
        productinfo: productInfo,
        firstname: firstName,
        email: user.email,
        phone: String(phone),
        surl: `${callbackUrl}/api/payments/callback`,
        furl: `${callbackUrl}/api/payments/callback`,
        curl: `${callbackUrl}/api/payments/callback`,
        hash,
      },
    })
  } catch (error) {
    console.error('PayU initiation error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not initiate payment',
    })
  }
})

// ==========================================
// PAYU CALLBACK
// ==========================================

router.post('/callback', async (req, res) => {
  console.log('PayU callback received:', {
    txnid: req.body.txnid,
    status: req.body.status,
  })

  try {
    const {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash,
      mihpayid,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
      additionalCharges,
    } = req.body

    if (
      !key ||
      !txnid ||
      !amount ||
      !status ||
      !hash ||
      key !== process.env.PAYU_KEY
    ) {
      return res.status(400).send('Invalid payment response')
    }

    const payment = await Payment.findOne({ txnid })

    if (!payment) {
      return res.status(404).send('Payment transaction not found')
    }

    if (payment.status === 'Success') {
      return res.redirect(`${getFrontendUrl()}/?payment=success`)
    }

    if (payment.status === 'Failed') {
      return res.redirect(`${getFrontendUrl()}/?payment=failed`)
    }

    const user = await User.findById(payment.user)

    if (!user) {
      return res.status(404).send('User account not found')
    }

    const expectedPlan = PLANS[payment.plan]
    const expectedFirstName = user.name.trim().split(/\s+/)[0].slice(0, 60)

    if (
      !expectedPlan ||
      Number(amount).toFixed(2) !== Number(payment.amount).toFixed(2) ||
      productinfo !== expectedPlan.description ||
      email?.toLowerCase() !== user.email.toLowerCase() ||
      firstname !== expectedFirstName
    ) {
      return res.status(400).send('Payment details do not match')
    }

    const reverseHashString =
      `${process.env.PAYU_SALT}|${status}||||||` +
      `${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|` +
      `${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`

    let calculatedHash = sha512(reverseHashString)

    if (additionalCharges) {
      calculatedHash = sha512(`${additionalCharges}|${reverseHashString}`)
    }

    if (!isValidHash(hash, calculatedHash)) {
      console.error('PayU callback hash verification failed:', txnid)
      return res.status(400).send('Payment response verification failed')
    }

    const verifiedTransaction = await verifyPaymentWithPayU(txnid)

    const verifiedStatus = String(
      verifiedTransaction.status || ''
    ).toLowerCase()

    const verifiedAmount = Number(
      verifiedTransaction.amt ??
      verifiedTransaction.transaction_amount
    )

    if (
      verifiedTransaction.txnid !== txnid ||
      !Number.isFinite(verifiedAmount) ||
      verifiedAmount.toFixed(2) !== Number(payment.amount).toFixed(2)
    ) {
      return res.status(400).send('Verified payment details do not match')
    }

    if (verifiedStatus !== 'success' || status.toLowerCase() !== 'success') {
      if (['failure', 'failed'].includes(verifiedStatus)) {
        await Payment.updateOne(
          { txnid, status: 'Pending' },
          { $set: { status: 'Failed' } }
        )

        return res.redirect(`${getFrontendUrl()}/?payment=failed`)
      }

      return res.redirect(`${getFrontendUrl()}/?payment=pending`)
    }

    // Claim this payment. Only one callback can process it.
    // A stale Processing payment can be retried after five minutes.
    const staleTime = new Date(Date.now() - PROCESSING_TIMEOUT)

    const claimedPayment = await Payment.findOneAndUpdate(
      {
        txnid,
        $or: [
          { status: 'Pending' },
          {
            status: 'Processing',
            processingAt: { $lt: staleTime },
          },
          {
            status: 'Processing',
            processingAt: null,
          },
        ],
      },
      {
        $set: {
          status: 'Processing',
          processingAt: new Date(),
        },
      },
      { new: true }
    )

    if (!claimedPayment) {
      const latestPayment = await Payment.findOne({ txnid })

      if (latestPayment?.status === 'Success') {
        return res.redirect(`${getFrontendUrl()}/?payment=success`)
      }

      if (latestPayment?.status === 'Processing') {
        return res.redirect(`${getFrontendUrl()}/?payment=pending`)
      }

      return res.redirect(`${getFrontendUrl()}/?payment=failed`)
    }

    try {
      const currentUser = await User.findById(claimedPayment.user)

      if (!currentUser) {
        throw new Error('User not found while activating subscription')
      }

      const paidAt = new Date()

      currentUser.subscription = claimedPayment.plan
      currentUser.subscriptionExpiresAt = new Date(
        paidAt.getTime() +
        SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000
      )

      await currentUser.save()

      const completedPayment = await Payment.findOneAndUpdate(
        {
          _id: claimedPayment._id,
          status: 'Processing',
        },
        {
          $set: {
            status: 'Success',
            payuPaymentId: verifiedTransaction.mihpayid || mihpayid || null,
            paidAt,
            processingAt: null,
          },
        },
        { new: true }
      )

      if (!completedPayment) {
        throw new Error('Could not finalize payment record')
      }

      console.log('Payment and subscription activated:', {
        txnid,
        plan: currentUser.subscription,
        expiresAt: currentUser.subscriptionExpiresAt,
      })

      try {
        await sendInvoiceEmail(currentUser, completedPayment)
        console.log('Invoice email sent:', currentUser.email)
      } catch (emailError) {
        console.error('Invoice email error:', emailError.message)
      }

      return res.redirect(`${getFrontendUrl()}/?payment=success`)
    } catch (processingError) {
      console.error('Subscription activation error:', processingError.message)

      // Allow a future verified callback to retry processing.
      await Payment.updateOne(
        { _id: claimedPayment._id, status: 'Processing' },
        {
          $set: {
            status: 'Pending',
            processingAt: null,
          },
        }
      )

      return res.status(500).send('Could not activate subscription')
    }
  } catch (error) {
    console.error('PayU callback error:', error.message)

    return res.status(500).send('Could not verify or process payment')
  }
})

// ==========================================
// DEVELOPMENT MOCK PAYMENT
// ==========================================

router.post('/mock-success', authenticateToken, async (req, res) => {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_MOCK_PAYMENTS !== 'true'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Mock payments are disabled',
    })
  }

  try {
    const { plan } = req.body

    if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan',
      })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const paidAt = new Date()
    const txnid = `MOCK${Date.now()}${crypto.randomBytes(4).toString('hex')}`

    const payment = await Payment.create({
      user: user._id,
      txnid,
      plan,
      amount: PLANS[plan].amount,
      status: 'Success',
      paidAt,
    })

    user.subscription = plan
    user.subscriptionExpiresAt = new Date(
      paidAt.getTime() +
      SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000
    )

    await user.save()

    try {
      await sendInvoiceEmail(user, payment)
    } catch (emailError) {
      console.error('Mock invoice email error:', emailError.message)
    }

    return res.json({
      success: true,
      mockPayment: true,
      message: 'Mock payment successful. No money was charged.',
      payment: {
        txnid: payment.txnid,
        plan: payment.plan,
        amount: payment.amount,
        status: payment.status,
      },
      subscription: {
        plan: user.subscription,
        expiresAt: user.subscriptionExpiresAt,
      },
    })
  } catch (error) {
    console.error('Mock payment error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Mock payment could not be completed',
    })
  }
})

router.post('/mock-failure', authenticateToken, async (req, res) => {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_MOCK_PAYMENTS !== 'true'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Mock payments are disabled',
    })
  }

  try {
    const { plan } = req.body

    if (!Object.prototype.hasOwnProperty.call(PLANS, plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan',
      })
    }

    const payment = await Payment.create({
      user: req.userId,
      txnid: `MOCKFAIL${Date.now()}${crypto.randomBytes(4).toString('hex')}`,
      plan,
      amount: PLANS[plan].amount,
      status: 'Failed',
    })

    return res.json({
      success: true,
      mockPayment: true,
      message: 'Mock payment failed. Subscription was not changed.',
      payment: {
        txnid: payment.txnid,
        plan: payment.plan,
        amount: payment.amount,
        status: payment.status,
      },
    })
  } catch (error) {
    console.error('Mock payment failure error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to create mock failed payment',
    })
  }
})

// ==========================================
// PAYMENT HISTORY
// ==========================================

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .select('txnid plan amount status payuPaymentId paidAt createdAt')
      .lean()

    return res.json({
      success: true,
      payments,
    })
  } catch (error) {
    console.error('Payment history error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not retrieve payment history',
    })
  }
})

module.exports = router

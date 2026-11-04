
const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const User = require('../models/User')
const Payment = require('../models/Payment')

const router = express.Router()

const PLANS = {
  Bronze: {
    amount: '100.00',
    description: 'PulseConnect Bronze Monthly Subscription',
  },
  Silver: {
    amount: '300.00',
    description: 'PulseConnect Silver Monthly Subscription',
  },
  Gold: {
    amount: '1000.00',
    description: 'PulseConnect Gold Monthly Subscription',
  },
}

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

function isPaymentTimeAllowed() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const hour = Number(parts.find((part) => part.type === 'hour').value)

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
  const callbackUrl = process.env.PAYU_CALLBACK_URL

  if (!callbackUrl || !callbackUrl.startsWith('https://')) {
    throw new Error('A public HTTPS PAYU_CALLBACK_URL is required')
  }

  return callbackUrl.replace(/\/$/, '')
}

// PayU classic Verify Payment API.
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
    throw new Error(`PayU verification unsuccessful: ${data.msg || 'Unknown error'}`)
  }

  const transaction = data.transaction_details?.[txnid]

  if (!transaction) {
    throw new Error('Transaction not found in PayU verification response')
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
    subject: 'PulseConnect subscription payment receipt',
    text: [
      `Hello ${user.name},`,
      '',
      'Your PulseConnect subscription payment was successful.',
      '',
      `Plan: ${payment.plan}`,
      `Amount: INR ${payment.amount}`,
      `Transaction ID: ${payment.txnid}`,
      `PayU Payment ID: ${payment.payuPaymentId || 'Not available'}`,
      `Payment date: ${paidDate}`,
      'Subscription duration: 30 days',
      '',
      'Thank you for using PulseConnect.',
    ].join('\n'),
  })
}

// Create a hosted PayU checkout session.
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
    const amount = selectedPlan.amount

    const hashString =
      `${process.env.PAYU_KEY}|${txnid}|${amount}|${productInfo}|` +
      `${firstName}|${user.email}|||||||||||${process.env.PAYU_SALT}`

    const hash = sha512(hashString)

    await Payment.create({
      user: user._id,
      txnid,
      plan,
      amount,
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

// Receive PayU's URL-encoded callback and verify it.
router.post('/callback', async (req, res) => {
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

    // Prevent sequential duplicate callbacks from extending the plan again.
    if (payment.status === 'Success') {
      return res.redirect(`${getFrontendUrl()}/?payment=success`)
    }

    const user = await User.findById(payment.user)

    if (!user) {
      return res.status(404).send('User account not found')
    }

    const expectedPlan = PLANS[payment.plan]
    const expectedFirstName = user.name.trim().split(/\s+/)[0].slice(0, 60)

    if (
      !expectedPlan ||
      Number(amount).toFixed(2) !== payment.amount ||
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
      calculatedHash = sha512(
        `${additionalCharges}|${reverseHashString}`
      )
    }

    if (!isValidHash(hash, calculatedHash)) {
      console.error('PayU callback hash verification failed:', txnid)
      return res.status(400).send('Payment response verification failed')
    }

    // A callback alone is not enough. Confirm the transaction directly with PayU.
    const verifiedTransaction = await verifyPaymentWithPayU(txnid)

    const verifiedStatus = String(
      verifiedTransaction.status || ''
    ).toLowerCase()

    const verifiedAmount = Number(
      verifiedTransaction.amt ?? verifiedTransaction.transaction_amount
    )

    if (
      verifiedTransaction.txnid !== txnid ||
      !Number.isFinite(verifiedAmount) ||
      verifiedAmount.toFixed(2) !== payment.amount
    ) {
      console.error('PayU verification details mismatch:', txnid)
      return res.status(400).send('Verified payment details do not match')
    }

    if (verifiedStatus !== 'success') {
      if (
        ['failure', 'failed'].includes(verifiedStatus) ||
        status.toLowerCase() !== 'success'
      ) {
        payment.status = 'Failed'
        await payment.save()

        return res.redirect(`${getFrontendUrl()}/?payment=failed`)
      }

      // Pending or unknown statuses must not activate a subscription.
      return res.redirect(`${getFrontendUrl()}/?payment=pending`)
    }

    if (status.toLowerCase() !== 'success') {
      return res.redirect(`${getFrontendUrl()}/?payment=pending`)
    }

    // Recheck before applying the subscription.
    const latestPayment = await Payment.findOne({ txnid })

    if (latestPayment.status === 'Success') {
      return res.redirect(`${getFrontendUrl()}/?payment=success`)
    }

    const paidAt = new Date()

    const currentExpiry =
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt > paidAt
        ? user.subscriptionExpiresAt
        : paidAt

    user.subscription = payment.plan
    user.subscriptionExpiresAt = new Date(
      currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000
    )

    await user.save()

    payment.status = 'Success'
    payment.payuPaymentId =
      verifiedTransaction.mihpayid || mihpayid || null
    payment.paidAt = paidAt

    await payment.save()

    try {
      await sendInvoiceEmail(user, payment)
    } catch (emailError) {
      console.error('Invoice email error:', emailError.message)
    }

    return res.redirect(`${getFrontendUrl()}/?payment=success`)
  } catch (error) {
    console.error('PayU callback error:', error.message)

    return res.status(500).send('Could not verify or process payment')
  }
})

// Retrieve the logged-in user's payment history.
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

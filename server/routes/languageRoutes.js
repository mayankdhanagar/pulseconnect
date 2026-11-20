
const express = require('express')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')

const User = require('../models/User')
const LanguageOTP = require('../models/LanguageOTP')

const router = express.Router()

// ==========================================
// CONFIGURATION
// ==========================================

const LANGUAGES = [
  'English',
  'Spanish',
  'Hindi',
  'Portuguese',
  'Chinese',
  'French',
]

const MSG91_VERIFY_URL =
  'https://control.msg91.com/api/v5/widget/verifyAccessToken'

// 60-second cooldown for MSG91 OTP requests
const otpRequestCooldown = new Map()
const OTP_COOLDOWN_MS = 60 * 1000

// Existing email transporter retained for compatibility
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

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
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

// ==========================================
// OTP HELPER FUNCTIONS
// Retained for existing email OTP compatibility
// ==========================================

function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

function compareOTP(submittedOTP, storedHash) {
  const submittedHash = hashOTP(submittedOTP)

  const submittedBuffer = Buffer.from(submittedHash, 'hex')
  const storedBuffer = Buffer.from(storedHash, 'hex')

  return (
    submittedBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(submittedBuffer, storedBuffer)
  )
}

// ==========================================
// PHONE NUMBER HELPER
// ==========================================

function normalizePhone(phone) {
  if (!phone) return null

  let digits = String(phone).replace(/\D/g, '')

  // Add Indian country code if missing
  if (digits.length === 10) {
    digits = '91' + digits
  }

  // Accept only Indian mobile numbers
  if (!/^91\d{10}$/.test(digits)) {
    return null
  }

  return digits
}

// ==========================================
// GET CURRENT LANGUAGE
// ==========================================

router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'preferredLanguage phone phoneVerified email'
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      })
    }

    return res.json({
      success: true,
      preferredLanguage: user.preferredLanguage || 'English',
    })
  } catch (error) {
    console.error('Get language error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not retrieve language preference',
    })
  }
})

// ==========================================
// REQUEST MOBILE OTP
// ALL SIX LANGUAGES USE MSG91
// ==========================================

router.post('/request-otp', authenticateToken, async (req, res) => {
  try {
    const { language } = req.body

    // Validate selected language
    if (!LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a supported language',
      })
    }

    // Check MSG91 configuration
    if (!process.env.MSG91_AUTH_KEY) {
      return res.status(503).json({
        success: false,
        message: 'MSG91 service is not configured on the server',
      })
    }

    // Find user
    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      })
    }

    // Check whether language is already selected
    if (user.preferredLanguage === language) {
      return res.status(400).json({
        success: false,
        message: 'This language is already selected',
      })
    }

    // Check registered mobile number
    if (!user.phone) {
      return res.status(400).json({
        success: false,
        message: 'Please add your mobile number first',
      })
    }

    const identifier = normalizePhone(user.phone)

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Your registered mobile number is invalid',
      })
    }

    // Check per-user 60-second cooldown
    const cooldownKey = String(user._id)
    const now = Date.now()

    const lastRequest =
      otpRequestCooldown.get(cooldownKey) || 0

    const remainingMs =
      OTP_COOLDOWN_MS - (now - lastRequest)

    if (remainingMs > 0) {
      const retryAfterSeconds = Math.ceil(
        remainingMs / 1000
      )

      return res.status(429).json({
        success: false,
        message: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
        retryAfterSeconds,
      })
    }

    // Save request time
    otpRequestCooldown.set(cooldownKey, now)

    // Frontend opens MSG91 widget for every language
    return res.json({
      success: true,
      message: 'Continue with MSG91 mobile verification',
      language,
      channel: 'sms',
      identifier,
    })
  } catch (error) {
    console.error('Language OTP request error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not request language verification',
    })
  }
})

// ==========================================
// VERIFY MSG91 MOBILE TOKEN
// ALL SIX LANGUAGES ACCEPTED
// ==========================================

router.post(
  '/verify-mobile-token',
  authenticateToken,
  async (req, res) => {
    try {
      const { accessToken, language } = req.body

      // Validate access token
      if (
        typeof accessToken !== 'string' ||
        accessToken.length < 20
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid MSG91 verification token',
        })
      }

      // Allow all six languages
      if (!LANGUAGES.includes(language)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported mobile verification language',
        })
      }

      // Check MSG91 configuration
      if (!process.env.MSG91_AUTH_KEY) {
        return res.status(503).json({
          success: false,
          message: 'MSG91 service is not configured on the server',
        })
      }

      // Find user
      const user = await User.findById(req.userId)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User account not found',
        })
      }

      // Check existing language
      if (user.preferredLanguage === language) {
        return res.status(400).json({
          success: false,
          message: 'This language is already selected',
        })
      }

      // Check registered mobile number
      if (!user.phone) {
        return res.status(400).json({
          success: false,
          message: 'Please add your mobile number first',
        })
      }

      const registeredPhone = normalizePhone(user.phone)

      if (!registeredPhone) {
        return res.status(400).json({
          success: false,
          message: 'Your registered mobile number is invalid',
        })
      }

      // Verify token with MSG91
      const msg91Response = await fetch(MSG91_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          authkey: process.env.MSG91_AUTH_KEY,
          'access-token': accessToken,
        }),
      })

      const verificationData = await msg91Response.json()

      // Check MSG91 response
      if (
        !msg91Response.ok ||
        verificationData.type !== 'success'
      ) {
        console.error(
          'MSG91 token verification failed:',
          verificationData.type,
          verificationData.code
        )

        return res.status(401).json({
          success: false,
          message: 'MSG91 could not verify the mobile OTP. Please try again.',
        })
      }

      // Get verified mobile number
      const verifiedPhone = normalizePhone(
        verificationData.message
      )

      // Match verified number with registered number
      if (
        !verifiedPhone ||
        verifiedPhone !== registeredPhone
      ) {
        return res.status(403).json({
          success: false,
          message: 'Verified mobile number does not match your registered number',
        })
      }

      // Update user after successful verification
      user.phoneVerified = true
      user.preferredLanguage = language

      await user.save()

      return res.json({
        success: true,
        message: 'Language changed successfully',
        preferredLanguage: user.preferredLanguage,
      })
    } catch (error) {
      console.error(
        'MSG91 mobile verification error:',
        error.message
      )

      return res.status(500).json({
        success: false,
        message: 'Could not verify mobile number or update language',
      })
    }
  }
)

// ==========================================
// LEGACY FRENCH EMAIL OTP VERIFICATION
// RETAINED FOR BACKWARD COMPATIBILITY
//
// Normal language changes must use MSG91.
// The frontend should not call this route.
// ==========================================

router.post('/verify-otp', authenticateToken, async (req, res) => {
  try {
    const { otp } = req.body

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Enter the six-digit verification code',
      })
    }

    const challenge = await LanguageOTP.findOne({
      user: req.userId,
      channel: 'email',
      language: 'French',
    })
      .sort({ createdAt: -1 })
      .select('+otpHash')

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'No pending email verification. Request a new OTP.',
      })
    }

    if (challenge.expiresAt <= new Date()) {
      await LanguageOTP.deleteMany({ user: req.userId })

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      })
    }

    if (challenge.attempts >= 5) {
      await LanguageOTP.deleteMany({ user: req.userId })

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Request a new OTP.',
      })
    }

    if (!compareOTP(otp, challenge.otpHash)) {
      challenge.attempts += 1

      const attemptsLeft = 5 - challenge.attempts

      if (attemptsLeft <= 0) {
        await LanguageOTP.deleteMany({ user: req.userId })

        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Request a new OTP.',
        })
      }

      await challenge.save()

      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`,
      })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      await LanguageOTP.deleteMany({ user: req.userId })

      return res.status(404).json({
        success: false,
        message: 'User account not found',
      })
    }

    user.preferredLanguage = 'French'
    await user.save()

    await LanguageOTP.deleteMany({ user: req.userId })

    return res.json({
      success: true,
      message: 'Language changed successfully',
      preferredLanguage: user.preferredLanguage,
    })
  } catch (error) {
    console.error('Language OTP verification error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not verify OTP or update language',
    })
  }
})

module.exports = router

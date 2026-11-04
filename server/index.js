const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
require('dotenv').config()

const Post = require('./models/Post')
const User = require('./models/User')
const LoginHistory = require('./models/LoginHistory')
const EmailChangeOTP = require('./models/EmailChangeOTP')
const LoginOTP = require('./models/LoginOTP')
const MonthlyPostUsage = require('./models/MonthlyPostUsage')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))
app.use('/api/audio', require('./routes/audioRoutes'))
app.use('/api/payments', require('./routes/paymentRoutes'))

// Email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Hash OTP before storing it in MongoDB.
function hashEmailOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Detect browser using the browser's User-Agent header.
function getBrowser(userAgent = '') {
  if (!userAgent) return 'Unknown'

  if (/EdgA\/|EdgiOS\/|Edg\//i.test(userAgent)) {
    return 'Microsoft Edge'
  }

  if (/OPR\/|OPiOS\/|Opera Mini|Opera Mobi/i.test(userAgent)) {
    return 'Opera'
  }

  if (/SamsungBrowser\//i.test(userAgent)) {
    return 'Samsung Internet'
  }

  if (/FxiOS\/|Firefox\//i.test(userAgent)) {
    return 'Mozilla Firefox'
  }

  if (/CriOS\/|Chrome\//i.test(userAgent)) {
    return 'Google Chrome'
  }

  if (/Brave\//i.test(userAgent)) {
    return 'Brave'
  }

  if (/Vivaldi\//i.test(userAgent)) {
    return 'Vivaldi'
  }

  if (/YaBrowser\//i.test(userAgent)) {
    return 'Yandex Browser'
  }

  if (/UCBrowser\//i.test(userAgent)) {
    return 'UC Browser'
  }

  if (/Safari\//i.test(userAgent)) {
    return 'Safari'
  }

  return 'Unknown'
}

// Detect operating system.
function getOperatingSystem(userAgent = '') {
  if (!userAgent) return 'Unknown'

  if (/Windows/i.test(userAgent)) return 'Windows'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macOS'
  if (/Linux/i.test(userAgent)) return 'Linux'

  return 'Unknown'
}

// Estimate device category from User-Agent.
function getDeviceCategory(userAgent = '') {
  if (!userAgent) return 'Unknown'

  if (/iPad|Tablet/i.test(userAgent)) {
    return 'Tablet'
  }

  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
    return 'Tablet'
  }

  if (/Mobile|Android|iPhone|iPod|Windows Phone/i.test(userAgent)) {
    return 'Mobile'
  }

  if (/Windows|Macintosh|Mac OS X|Linux|X11/i.test(userAgent)) {
    return 'Desktop/Laptop'
  }

  return 'Unknown'
}

// Allow mobile login only between 10 AM and 1 PM IST.
function isMobileLoginAllowed(date = new Date()) {
  const istTime = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = Number(
    istTime.find((part) => part.type === 'hour').value
  )

  // 10:00 AM inclusive, 1:00 PM exclusive.
  return hour >= 10 && hour < 13
}

// Record a successful login in MongoDB.
async function recordLogin(req, userId) {
  const userAgent = req.get('user-agent') || ''

  return LoginHistory.create({
    user: userId,
    browser: getBrowser(userAgent),
    operatingSystem: getOperatingSystem(userAgent),
    deviceCategory: getDeviceCategory(userAgent),
    ipAddress: req.ip || 'Unknown',
    loggedInAt: new Date(),
  })
}

// Create a JWT and return the authenticated user.
function createLoginResponse(user) {
  const token = jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )

  return {
    success: true,
    message: 'Login successful',
    token,
    expiresIn: '1h',
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      subscription: user.subscription,
    },
  }
}

// Get the beginning of the current calendar day in Indian Standard Time.
function getISTDayStart(date = new Date()) {
  const IST_OFFSET_MINUTES = 330

  const istDate = new Date(
    date.getTime() + IST_OFFSET_MINUTES * 60 * 1000
  )

  const istMidnightUTC = Date.UTC(
    istDate.getUTCFullYear(),
    istDate.getUTCMonth(),
    istDate.getUTCDate()
  )

  return new Date(
    istMidnightUTC - IST_OFFSET_MINUTES * 60 * 1000
  )
}
// Monthly tweet limits for each subscription plan.
const TWEET_LIMITS = {
  Free: 1,
  Bronze: 3,
  Silver: 5,
  Gold: Infinity,
}

// Get current month boundaries according to Indian Standard Time.
function getISTMonthInfo(date = new Date()) {
  const IST_OFFSET_MINUTES = 330
  const offsetMilliseconds = IST_OFFSET_MINUTES * 60 * 1000

  const istDate = new Date(date.getTime() + offsetMilliseconds)
  const year = istDate.getUTCFullYear()
  const month = istDate.getUTCMonth()

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const monthStartUTC = Date.UTC(year, month, 1)
  const nextMonthStartUTC = Date.UTC(year, month + 1, 1)

  return {
    monthKey,
    start: new Date(monthStartUTC - offsetMilliseconds),
    end: new Date(nextMonthStartUTC - offsetMilliseconds),
  }
}

// Initialize monthly usage, including existing posts.
async function initializeMonthlyUsage(user, monthInfo) {
  let usage = await MonthlyPostUsage.findOne({
    user: user._id,
    monthKey: monthInfo.monthKey,
  })

  if (usage) return usage

  const existingPosts = await Post.countDocuments({
    username: `@${user.username}`,
    createdAt: {
      $gte: monthInfo.start,
      $lt: monthInfo.end,
    },
  })

  try {
    return await MonthlyPostUsage.create({
      user: user._id,
      monthKey: monthInfo.monthKey,
      count: existingPosts,
    })
  } catch (error) {
    if (error.code === 11000) {
      usage = await MonthlyPostUsage.findOne({
        user: user._id,
        monthKey: monthInfo.monthKey,
      })

      if (usage) return usage
    }

    throw error
  }
}

// Generate a cryptographically secure password using letters only.
function generateTemporaryPassword(length = 12) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let password = ''

  for (let index = 0; index < length; index += 1) {
    password += alphabet[crypto.randomInt(0, alphabet.length)]
  }

  return password
}

// Home
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to PulseConnect API!',
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PulseConnect backend is healthy',
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
  })
})

// Middleware: verify JWT token.
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

// Get posts: public feed.
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 })

    res.json({
      success: true,
      count: posts.length,
      posts,
    })
  } catch (error) {
    console.error('Fetch posts error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
    })
  }
})

// Create post: login required, monthly subscription limit enforced.
app.post('/api/posts', authenticateToken, async (req, res) => {
  let reservedUsage = false
  let userId = null
  let monthKey = null

  try {
    const { content } = req.body

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
      })
    }

    if (content.trim().length > 280) {
      return res.status(400).json({
        success: false,
        message: 'Post cannot exceed 280 characters',
      })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
      })
    }

    userId = user._id

    // Expire old paid subscriptions.
    if (
      user.subscription !== 'Free' &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt <= new Date()
    ) {
      user.subscription = 'Free'
      user.subscriptionExpiresAt = null
      await user.save()
    }

    const plan = user.subscription || 'Free'
    const limit = TWEET_LIMITS[plan] ?? TWEET_LIMITS.Free
    const monthInfo = getISTMonthInfo()

    monthKey = monthInfo.monthKey

    await initializeMonthlyUsage(user, monthInfo)

    // Atomically reserve one tweet.
    const usageFilter = {
      user: user._id,
      monthKey,
    }

    if (Number.isFinite(limit)) {
      usageFilter.count = { $lt: limit }
    }

    const updatedUsage = await MonthlyPostUsage.findOneAndUpdate(
      usageFilter,
      { $inc: { count: 1 } },
      { new: true, runValidators: true }
    )

    if (!updatedUsage) {
      const currentUsage = await MonthlyPostUsage.findOne({
        user: user._id,
        monthKey,
      })

      return res.status(403).json({
        success: false,
        message: `You have reached your ${plan} plan limit of ${limit} tweets this month.`,
        plan,
        limit: Number.isFinite(limit) ? limit : null,
        used: currentUsage?.count ?? limit,
      })
    }

    reservedUsage = true

    let post

    try {
      post = await Post.create({
        user: user._id,
        author: user.name,
        username: `@${user.username}`,
        content: content.trim(),
      })
    } catch (postError) {
      await MonthlyPostUsage.updateOne(
        { user: user._id, monthKey, count: { $gt: 0 } },
        { $inc: { count: -1 } }
      )

      reservedUsage = false
      throw postError
    }

    return res.status(201).json({
      success: true,
      post,
      usage: {
        plan,
        used: updatedUsage.count,
        limit: Number.isFinite(limit) ? limit : null,
      },
    })
  } catch (error) {
    if (reservedUsage && userId && monthKey) {
      try {
        await MonthlyPostUsage.updateOne(
          { user: userId, monthKey, count: { $gt: 0 } },
          { $inc: { count: -1 } }
        )
      } catch (refundError) {
        console.error('Tweet usage refund error:', refundError.message)
      }
    }

    console.error('Create post error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
    })
  }
})

// Create post: login required, monthly subscription limit enforced.
app.post('/api/posts', authenticateToken, async (req, res) => {
  let reservedUsage = false
  let userId = null
  let monthKey = null

  try {
    const { content } = req.body

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
      })
    }

    if (content.trim().length > 280) {
      return res.status(400).json({
        success: false,
        message: 'Post cannot exceed 280 characters',
      })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
      })
    }

    userId = user._id

    // Expire old paid subscriptions.
    if (
      user.subscription !== 'Free' &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt <= new Date()
    ) {
      user.subscription = 'Free'
      user.subscriptionExpiresAt = null
      await user.save()
    }

    const plan = user.subscription || 'Free'
    const limit = TWEET_LIMITS[plan] ?? TWEET_LIMITS.Free
    const monthInfo = getISTMonthInfo()

    monthKey = monthInfo.monthKey

    await initializeMonthlyUsage(user, monthInfo)

    // Atomically reserve one tweet.
    const usageFilter = {
      user: user._id,
      monthKey,
    }

    if (Number.isFinite(limit)) {
      usageFilter.count = { $lt: limit }
    }

    const updatedUsage = await MonthlyPostUsage.findOneAndUpdate(
      usageFilter,
      { $inc: { count: 1 } },
      { new: true, runValidators: true }
    )

    if (!updatedUsage) {
      const currentUsage = await MonthlyPostUsage.findOne({
        user: user._id,
        monthKey,
      })

      return res.status(403).json({
        success: false,
        message: `You have reached your ${plan} plan limit of ${limit} tweets this month.`,
        plan,
        limit: Number.isFinite(limit) ? limit : null,
        used: currentUsage?.count ?? limit,
      })
    }

    reservedUsage = true

    let post

    try {
      post = await Post.create({
        user: user._id,
        author: user.name,
        username: `@${user.username}`,
        content: content.trim(),
      })
    } catch (postError) {
      await MonthlyPostUsage.updateOne(
        { user: user._id, monthKey, count: { $gt: 0 } },
        { $inc: { count: -1 } }
      )

      reservedUsage = false
      throw postError
    }

    return res.status(201).json({
      success: true,
      post,
      usage: {
        plan,
        used: updatedUsage.count,
        limit: Number.isFinite(limit) ? limit : null,
      },
    })
  } catch (error) {
    if (reservedUsage && userId && monthKey) {
      try {
        await MonthlyPostUsage.updateOne(
          { user: userId, monthKey, count: { $gt: 0 } },
          { $inc: { count: -1 } }
        )
      } catch (refundError) {
        console.error('Tweet usage refund error:', refundError.message)
      }
    }

    console.error('Create post error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
    })
  }
})

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body

    if (
      typeof name !== 'string' ||
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    const cleanName = name.trim()
    const cleanUsername = username.trim().toLowerCase()
    const cleanEmail = email.trim().toLowerCase()

    if (
      cleanName.length > 50 ||
      cleanUsername.length > 30 ||
      password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72 ||
      !/^[a-zA-Z0-9_]+$/.test(cleanUsername) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please check your details and password length',
      })
    }

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }],
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email or username is already registered',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
    })

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        subscription: user.subscription,
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email or username is already registered',
      })
    }

    console.error('Registration error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not create account',
    })
  }
})

// Login: Chrome requires email OTP; other browsers log in directly.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body

    if (
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      !identifier.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required',
      })
    }

    const value = identifier.trim().toLowerCase()

    const user = await User.findOne({
      $or: [{ email: value }, { username: value }],
    }).select('+password')

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      })
    }

    const userAgent = req.get('user-agent') || ''
    const deviceCategory = getDeviceCategory(userAgent)

    // Mobile users can log in only between 10 AM and 1 PM IST.
    if (
      deviceCategory === 'Mobile' &&
      !isMobileLoginAllowed()
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Mobile login is allowed only between 10:00 AM and 1:00 PM IST.',
      })
    }

    const browser = getBrowser(userAgent)

    // Chrome login requires email OTP verification.
    if (browser === 'Google Chrome') {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(503).json({
          success: false,
          message: 'Email service is not configured',
        })
      }

      // Allow one OTP request every 60 seconds.
      const recentRequest = await LoginOTP.findOne({
        user: user._id,
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
      }).sort({ createdAt: -1 })

      if (recentRequest) {
        return res.status(429).json({
          success: false,
          message: 'Please wait 60 seconds before requesting another OTP',
        })
      }

      await LoginOTP.deleteMany({ user: user._id })

      const otp = crypto.randomInt(100000, 1000000).toString()

      await LoginOTP.create({
        user: user._id,
        otpHash: hashEmailOTP(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      })

      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'PulseConnect login verification',
          text: [
            'A login attempt was made on your PulseConnect account using Google Chrome.',
            '',
            `Your verification code is: ${otp}`,
            '',
            'This code expires in 10 minutes.',
            'You have a maximum of 5 attempts.',
            'If you did not try to log in, you can ignore this email.',
          ].join('\n'),
        })
      } catch (mailError) {
        await LoginOTP.deleteMany({ user: user._id })

        console.error('Login OTP email delivery failed:', mailError.message)

        return res.status(502).json({
          success: false,
          message: 'Could not send login OTP. Please try again later.',
        })
      }

      return res.json({
        success: true,
        requiresOTP: true,
        message: 'Verification code sent to your registered email address',
        identifier: user.username,
        expiresInSeconds: 600,
      })
    }

    // Non-Chrome browsers, including Microsoft Edge, log in directly.
    const response = createLoginResponse(user)

    // Save history only after credentials are verified.
    // A history failure should not prevent login.
    try {
      await recordLogin(req, user._id)
    } catch (historyError) {
      console.error('Login history error:', historyError.message)
    }

    return res.json(response)
  } catch (error) {
    console.error('Login error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not log in',
    })
  }
})

// Verify Chrome login OTP and issue JWT only after successful verification.
app.post('/api/auth/login/verify-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body

    if (
      typeof identifier !== 'string' ||
      !identifier.trim() ||
      typeof otp !== 'string' ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Enter your username/email and the six-digit OTP',
      })
    }

    const value = identifier.trim().toLowerCase()

    const user = await User.findOne({
      $or: [{ email: value }, { username: value }],
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login verification request',
      })
    }

    const userAgent = req.get('user-agent') || ''
    const deviceCategory = getDeviceCategory(userAgent)

    // Recheck the time when the user verifies the OTP.
    if (
      deviceCategory === 'Mobile' &&
      !isMobileLoginAllowed()
    ) {
      await LoginOTP.deleteMany({ user: user._id })

      return res.status(403).json({
        success: false,
        message:
          'Mobile login is allowed only between 10:00 AM and 1:00 PM IST.',
      })
    }

    const challenge = await LoginOTP.findOne({
      user: user._id,
    })
      .sort({ createdAt: -1 })
      .select('+otpHash')

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'No pending login verification. Please log in again.',
      })
    }

    if (challenge.expiresAt <= new Date()) {
      await LoginOTP.deleteMany({ user: user._id })

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please log in again.',
      })
    }

    if (challenge.attempts >= 5) {
      await LoginOTP.deleteMany({ user: user._id })

      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please log in again.',
      })
    }

    const submittedHash = hashEmailOTP(otp)
    const submittedBuffer = Buffer.from(submittedHash, 'hex')
    const storedBuffer = Buffer.from(challenge.otpHash, 'hex')

    const matches =
      submittedBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(submittedBuffer, storedBuffer)

    if (!matches) {
      challenge.attempts += 1
      const attemptsLeft = Math.max(0, 5 - challenge.attempts)

      if (attemptsLeft === 0) {
        await LoginOTP.deleteMany({ user: user._id })
      } else {
        await challenge.save()
      }

      return res.status(attemptsLeft === 0 ? 429 : 400).json({
        success: false,
        message:
          attemptsLeft === 0
            ? 'Too many incorrect attempts. Please log in again.'
            : `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`,
      })
    }

    // OTP is correct: consume the challenge before issuing the token.
    await LoginOTP.deleteMany({ user: user._id })

    const response = createLoginResponse(user)

    // Record login only after OTP verification succeeds.
    try {
      await recordLogin(req, user._id)
    } catch (historyError) {
      console.error('Login history error:', historyError.message)
    }

    return res.json(response)
  } catch (error) {
    console.error('Login OTP verification error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not verify login OTP',
    })
  }
})

// Get current user's profile and last 10 login records.
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'name username email subscription createdAt'
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const loginHistory = await LoginHistory.find({
      user: user._id,
    })
      .sort({ loggedInAt: -1 })
      .limit(10)
      .select('browser operatingSystem deviceCategory ipAddress loggedInAt')
      .lean()

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        subscription: user.subscription,
        createdAt: user.createdAt,
      },
      loginHistory,
    })
  } catch (error) {
    console.error('Get profile error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Could not retrieve profile',
    })
  }
})

// Forgot Password API.
app.post('/api/auth/forgot-password', async (req, res) => {
  let userId = null
  let previousPasswordHash = null
  let previousResetTimestamp = null
  let resetTimestamp = null
  let temporaryPasswordHash = null

  try {
    const { email } = req.body

    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      })
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured',
      })
    }

    const cleanEmail = email.trim().toLowerCase()

    const user = await User.findOne({
      email: cleanEmail,
    }).select('+password')

    // Do not reveal whether an email is registered.
    if (!user) {
      return res.json({
        success: true,
        message:
          'If an account exists for this email, password reset instructions will be sent.',
      })
    }

    userId = user._id
    previousPasswordHash = user.password
    previousResetTimestamp = user.passwordResetRequestedAt || null

    const now = new Date()
    const istDayStart = getISTDayStart(now)

    // Atomically reserve the daily reset.
    const reservedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { passwordResetRequestedAt: null },
          { passwordResetRequestedAt: { $exists: false } },
          { passwordResetRequestedAt: { $lt: istDayStart } },
        ],
      },
      {
        $set: { passwordResetRequestedAt: now },
      },
      { new: true }
    )

    if (!reservedUser) {
      return res.status(429).json({
        success: false,
        message: 'You can use this option only one time per day.',
      })
    }

    resetTimestamp = now

    const temporaryPassword = generateTemporaryPassword(12)
    temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 12)

    const passwordUpdate = await User.updateOne(
      {
        _id: userId,
        passwordResetRequestedAt: resetTimestamp,
      },
      {
        $set: { password: temporaryPasswordHash },
      }
    )

    if (passwordUpdate.modifiedCount !== 1) {
      throw new Error('Could not update the temporary password')
    }

    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Your PulseConnect temporary password',
        text: [
          `Hello ${user.name},`,
          '',
          'Your PulseConnect password reset request was successful.',
          `Your temporary password is: ${temporaryPassword}`,
          '',
          'Please log in and change this temporary password as soon as possible.',
          'If you did not request this reset, contact PulseConnect support.',
        ].join('\n'),
      })
    } catch (mailError) {
      // Restore the previous password and reset timestamp if email fails.
      const rollbackUpdate = {
        $set: {
          password: previousPasswordHash,
        },
      }

      if (previousResetTimestamp) {
        rollbackUpdate.$set.passwordResetRequestedAt =
          previousResetTimestamp
      } else {
        rollbackUpdate.$unset = {
          passwordResetRequestedAt: 1,
        }
      }

      await User.updateOne(
        {
          _id: userId,
          password: temporaryPasswordHash,
          passwordResetRequestedAt: resetTimestamp,
        },
        rollbackUpdate
      )

      console.error(
        'Forgot-password email delivery failed:',
        mailError.message
      )

      return res.status(502).json({
        success: false,
        message:
          'Could not send the reset email. Your previous password remains unchanged. Please try again later.',
      })
    }

    return res.json({
      success: true,
      message:
        'A new temporary password has been sent to your registered email address.',
    })
  } catch (error) {
    console.error('Forgot-password error:', error.message)

    // Best-effort rollback after an unexpected error.
    if (userId && resetTimestamp && previousPasswordHash) {
      try {
        const rollbackFilter = {
          _id: userId,
          passwordResetRequestedAt: resetTimestamp,
        }

        if (temporaryPasswordHash) {
          rollbackFilter.password = temporaryPasswordHash
        }

        const rollbackUpdate = {
          $set: {
            password: previousPasswordHash,
          },
        }

        if (previousResetTimestamp) {
          rollbackUpdate.$set.passwordResetRequestedAt =
            previousResetTimestamp
        } else {
          rollbackUpdate.$unset = {
            passwordResetRequestedAt: 1,
          }
        }

        await User.updateOne(rollbackFilter, rollbackUpdate)
      } catch (rollbackError) {
        console.error(
          'Forgot-password rollback error:',
          rollbackError.message
        )
      }
    }

    return res.status(500).json({
      success: false,
      message:
        'Could not process the password reset request. Please try again later.',
    })
  }
})

// Request OTP for changing the authenticated user's email.
app.post(
  '/api/auth/change-email/request',
  authenticateToken,
  async (req, res) => {
    try {
      const { newEmail } = req.body

      if (
        typeof newEmail !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address',
        })
      }

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return res.status(503).json({
          success: false,
          message: 'Email service is not configured',
        })
      }

      const cleanEmail = newEmail.trim().toLowerCase()
      const user = await User.findById(req.userId)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User account not found',
        })
      }

      if (cleanEmail === user.email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'This is already your registered email',
        })
      }

      const existingUser = await User.findOne({
        email: cleanEmail,
      })

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered to another account',
        })
      }

      // Limit OTP requests to one per user every 60 seconds.
      const recentRequest = await EmailChangeOTP.findOne({
        user: user._id,
        createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
      }).sort({ createdAt: -1 })

      if (recentRequest) {
        return res.status(429).json({
          success: false,
          message: 'Please wait 60 seconds before requesting another OTP',
        })
      }

      await EmailChangeOTP.deleteMany({
        user: user._id,
      })

      const otp = crypto.randomInt(100000, 1000000).toString()

      await EmailChangeOTP.create({
        user: user._id,
        newEmail: cleanEmail,
        otpHash: hashEmailOTP(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      })

      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: cleanEmail,
          subject: 'PulseConnect email change verification',
          text: [
            'You requested to change your registered PulseConnect email.',
            '',
            `Your verification code is: ${otp}`,
            '',
            'This code expires in 10 minutes.',
            'If you did not request this change, ignore this email.',
          ].join('\n'),
        })
      } catch (mailError) {
        await EmailChangeOTP.deleteMany({
          user: user._id,
        })

        console.error(
          'Email-change email delivery failed:',
          mailError.message
        )

        return res.status(502).json({
          success: false,
          message:
            'Could not send the verification email. Please try again later.',
        })
      }

      return res.json({
        success: true,
        message: 'Verification OTP sent to your new email address',
        expiresInSeconds: 600,
      })
    } catch (error) {
      console.error('Email-change OTP request error:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Could not request an email change',
      })
    }
  }
)

// Verify OTP and update the authenticated user's email.
app.post(
  '/api/auth/change-email/verify',
  authenticateToken,
  async (req, res) => {
    try {
      const { otp } = req.body

      if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message: 'Enter the six-digit verification code',
        })
      }

      const challenge = await EmailChangeOTP.findOne({
        user: req.userId,
      })
        .sort({ createdAt: -1 })
        .select('+otpHash')

      if (!challenge) {
        return res.status(400).json({
          success: false,
          message: 'No pending email-change request. Request a new OTP.',
        })
      }

      if (challenge.expiresAt <= new Date()) {
        await EmailChangeOTP.deleteMany({
          user: req.userId,
        })

        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.',
        })
      }

      if (challenge.attempts >= 5) {
        await EmailChangeOTP.deleteMany({
          user: req.userId,
        })

        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Request a new OTP.',
        })
      }

      const submittedHash = hashEmailOTP(otp)
      const submittedBuffer = Buffer.from(submittedHash, 'hex')
      const storedBuffer = Buffer.from(challenge.otpHash, 'hex')

      const matches =
        submittedBuffer.length === storedBuffer.length &&
        crypto.timingSafeEqual(submittedBuffer, storedBuffer)

      if (!matches) {
        challenge.attempts += 1
        const attemptsLeft = Math.max(0, 5 - challenge.attempts)

        if (attemptsLeft === 0) {
          await EmailChangeOTP.deleteMany({
            user: req.userId,
          })
        } else {
          await challenge.save()
        }

        return res.status(attemptsLeft === 0 ? 429 : 400).json({
          success: false,
          message:
            attemptsLeft === 0
              ? 'Too many incorrect attempts. Request a new OTP.'
              : `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`,
        })
      }

      const user = await User.findById(req.userId)

      if (!user) {
        await EmailChangeOTP.deleteMany({
          user: req.userId,
        })

        return res.status(404).json({
          success: false,
          message: 'User account not found',
        })
      }

      if (user.email.toLowerCase() === challenge.newEmail.toLowerCase()) {
        await EmailChangeOTP.deleteMany({
          user: req.userId,
        })

        return res.status(400).json({
          success: false,
          message: 'This is already your registered email',
        })
      }

      const existingUser = await User.findOne({
        email: challenge.newEmail,
        _id: { $ne: user._id },
      })

      if (existingUser) {
        await EmailChangeOTP.deleteMany({
          user: req.userId,
        })

        return res.status(409).json({
          success: false,
          message: 'This email is already registered to another account',
        })
      }

      user.email = challenge.newEmail
      await user.save()

      await EmailChangeOTP.deleteMany({
        user: req.userId,
      })

      return res.json({
        success: true,
        message: 'Your registered email has been updated successfully',
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          subscription: user.subscription,
        },
      })
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered to another account',
        })
      }

      console.error('Email-change verification error:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Could not verify the OTP or update your email',
      })
    }
  }
)

// Start server.
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from server/.env')
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters')
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected successfully')

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`PulseConnect server running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
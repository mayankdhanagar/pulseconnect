const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

const User = require('../models/User')
const AudioTweet = require('../models/AudioTweet')
const AudioUploadOTP = require('../models/AudioUploadOTP')

const router = express.Router()

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'audio')
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_DURATION_SECONDS = 300

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex')
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
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}

function isAudioUploadTimeAllowed(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = Number(parts.find((part) => part.type === 'hour').value)

  // 2 PM inclusive, 7 PM exclusive.
  return hour >= 14 && hour < 19
}

const allowedAudioTypes = new Set([
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/ogg',
  'audio/aac',
])

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, UPLOAD_DIR)
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedAudioTypes.has(file.mimetype)) {
      return callback(
        new Error('Unsupported audio format. Use WebM, MP3, WAV, M4A or OGG.')
      )
    }

    callback(null, true)
  },
})

function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    fs.unlink(file.path, () => {})
  }
}

// Request email OTP before uploading audio.
router.post('/request-otp', authenticateToken, async (req, res) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured',
      })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      })
    }

    const recentOTP = await AudioUploadOTP.findOne({
      user: user._id,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    })

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 60 seconds before requesting another OTP.',
      })
    }

    const otp = crypto.randomInt(100000, 1000000).toString()

    await AudioUploadOTP.findOneAndUpdate(
      { user: user._id },
      {
        otpHash: hashOTP(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        createdAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'PulseConnect audio upload verification',
        text: [
          `Your audio upload verification code is: ${otp}`,
          '',
          'This code expires in 10 minutes.',
          'You have a maximum of 5 attempts.',
          'If you did not request this code, you can ignore this email.',
        ].join('\n'),
      })
    } catch (mailError) {
      await AudioUploadOTP.deleteOne({ user: user._id })

      console.error('Audio OTP email error:', mailError.message)

      return res.status(502).json({
        success: false,
        message: 'Could not send OTP. Please try again later.',
      })
    }

    return res.json({
      success: true,
      message: 'OTP sent to your registered email address.',
      expiresInSeconds: 600,
    })
  } catch (error) {
    console.error('Audio OTP request error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not request audio upload OTP.',
    })
  }
})

// Upload audio after email OTP verification.
router.post(
  '/',
  authenticateToken,
  (req, res, next) => {
    if (!isAudioUploadTimeAllowed()) {
      return res.status(403).json({
        success: false,
        message: 'Audio uploads are allowed only between 2:00 PM and 7:00 PM IST.',
      })
    }

    next()
  },
  (req, res, next) => {
    upload.single('audio')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          success: false,
          message:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Audio file cannot exceed 100 MB.'
              : error.message || 'Audio upload failed.',
        })
      }

      next()
    })
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select an audio file.',
        })
      }

      const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : ''
      const durationSeconds = Number(req.body.durationSeconds)

      if (!/^\d{6}$/.test(otp)) {
        removeUploadedFile(req.file)

        return res.status(400).json({
          success: false,
          message: 'Enter the valid 6-digit email OTP.',
        })
      }

      if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0 ||
        durationSeconds > MAX_DURATION_SECONDS
      ) {
        removeUploadedFile(req.file)

        return res.status(400).json({
          success: false,
          message: 'Audio duration cannot exceed 5 minutes.',
        })
      }

      const challenge = await AudioUploadOTP.findOne({
        user: req.userId,
      }).select('+otpHash')

      if (!challenge) {
        removeUploadedFile(req.file)

        return res.status(400).json({
          success: false,
          message: 'Please request an email OTP before uploading audio.',
        })
      }

      if (challenge.expiresAt <= new Date()) {
        await AudioUploadOTP.deleteOne({ _id: challenge._id })
        removeUploadedFile(req.file)

        return res.status(400).json({
          success: false,
          message: 'OTP expired. Please request a new OTP.',
        })
      }

      if (challenge.attempts >= 5) {
        await AudioUploadOTP.deleteOne({ _id: challenge._id })
        removeUploadedFile(req.file)

        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Request a new OTP.',
        })
      }

      const submittedHash = hashOTP(otp)
      const submittedBuffer = Buffer.from(submittedHash, 'hex')
      const storedBuffer = Buffer.from(challenge.otpHash, 'hex')

      const matches =
        submittedBuffer.length === storedBuffer.length &&
        crypto.timingSafeEqual(submittedBuffer, storedBuffer)

      if (!matches) {
        challenge.attempts += 1

        if (challenge.attempts >= 5) {
          await AudioUploadOTP.deleteOne({ _id: challenge._id })
        } else {
          await challenge.save()
        }

        removeUploadedFile(req.file)

        return res.status(400).json({
          success: false,
          message: 'Incorrect OTP. Please try again.',
        })
      }

      const audioTweet = await AudioTweet.create({
        user: new mongoose.Types.ObjectId(req.userId),
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        durationSeconds,
      })

      // OTP can be used only once.
      await AudioUploadOTP.deleteOne({ _id: challenge._id })

      return res.status(201).json({
        success: true,
        message: 'Audio tweet uploaded successfully.',
        audioTweet: {
          id: audioTweet._id,
          fileName: audioTweet.fileName,
          originalName: audioTweet.originalName,
          durationSeconds: audioTweet.durationSeconds,
          size: audioTweet.size,
          audioUrl: `/api/audio/files/${audioTweet.fileName}`,
          createdAt: audioTweet.createdAt,
        },
      })
    } catch (error) {
      removeUploadedFile(req.file)

      console.error('Audio upload error:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Could not upload audio tweet.',
      })
    }
  }
)

// List the logged-in user's audio tweets.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const audioTweets = await AudioTweet.find({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .lean()

    return res.json({
      success: true,
      audioTweets: audioTweets.map((item) => ({
        ...item,
        audioUrl: `/api/audio/files/${item.fileName}`,
      })),
    })
  } catch (error) {
    console.error('Fetch audio tweets error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Could not fetch audio tweets.',
    })
  }
})

// Serve uploaded audio files.
router.use('/files', express.static(UPLOAD_DIR))

module.exports = router
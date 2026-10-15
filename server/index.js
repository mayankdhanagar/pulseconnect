
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const Post = require('./models/Post')
const User = require('./models/User')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '1mb' }))

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

// Middleware: verify JWT token
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

// Get posts: public feed
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

// Create post: login required
app.post('/api/posts', authenticateToken, async (req, res) => {
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

    // Get identity from the verified account, not from the request body.
    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
      })
    }

    const post = await Post.create({
      author: user.name,
      username: `@${user.username}`,
      content: content.trim(),
    })

    res.status(201).json({
      success: true,
      post,
    })
  } catch (error) {
    console.error('Create post error:', error.message)
    res.status(500).json({
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

// Login and issue JWT
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

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    res.json({
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
    })
  } catch (error) {
    console.error('Login error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Could not log in',
    })
  }
})

// Get current logged-in user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        subscription: user.subscription,
      },
    })
  } catch (error) {
    console.error('Get current user error:', error.message)
    res.status(500).json({
      success: false,
      message: 'Could not retrieve user',
    })
  }
})

// Start server
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

    app.listen(PORT, () => {
      console.log(`PulseConnect server running at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()

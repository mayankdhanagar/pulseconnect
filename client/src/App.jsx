import { useCallback, useEffect, useRef, useState } from 'react'
import AudioTweets from './AudioTweets'
import './App.css'

const API_BASE = 'http://localhost:5000/api'
const POSTS_URL = `${API_BASE}/posts`
const TOKEN_KEY = 'pulseconnect_token'
const NOTIFICATION_KEY = 'pulseconnect_notifications'

function App() {
  const [post, setPost] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || ''
  )
  const [user, setUser] = useState(null)
  const [loginHistory, setLoginHistory] = useState([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)

  // Browser notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem(NOTIFICATION_KEY) === 'true'
  )
  const knownPostIds = useRef(new Set())
  const firstPostsLoad = useRef(true)

  // Chrome login OTP state
  const [loginOTPSent, setLoginOTPSent] = useState(false)
  const [loginOTPIdentifier, setLoginOTPIdentifier] = useState('')
  const [loginOTP, setLoginOTP] = useState('')
  const [loginOTPMessage, setLoginOTPMessage] = useState('')

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [emailOTP, setEmailOTP] = useState('')
  const [emailOTPSent, setEmailOTPSent] = useState(false)
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [emailChangeMessage, setEmailChangeMessage] = useState('')
  const [emailChangeError, setEmailChangeError] = useState('')

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    identifier: '',
    password: '',
  })

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function requestJSON(url, options = {}) {
    const response = await fetch(url, options)
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Something went wrong')
    }

    return data
  }

  const fetchProfile = useCallback(async (currentToken = token) => {
    if (!currentToken) return

    try {
      setProfileLoading(true)

      const data = await requestJSON(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      setUser(data.user)
      setLoginHistory(
        Array.isArray(data.loginHistory) ? data.loginHistory : []
      )
    } finally {
      setProfileLoading(false)
    }
  }, [token])

  async function loginUser(identifier, password) {
    const data = await requestJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    })

    if (data.requiresOTP) {
      setLoginOTPIdentifier(data.identifier || identifier.trim())
      setLoginOTP('')
      setLoginOTPMessage(
        data.message ||
          'A verification code has been sent to your registered email address.'
      )
      setLoginOTPSent(true)
      setError('')
      return
    }

    if (!data.token) {
      throw new Error('Login succeeded, but no token was received')
    }

    sessionStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    setLoginHistory([])
    setLoginOTPSent(false)
    setLoginOTPIdentifier('')
    setLoginOTP('')
    setLoginOTPMessage('')
    setActiveView('home')
    setError('')

    try {
      await fetchProfile(data.token)
    } catch {
      // Login can continue if login history fails to load.
    }
  }

  async function verifyLoginOTP(event) {
    event.preventDefault()
    if (authLoading) return

    const normalizedOTP = loginOTP.trim()

    if (!/^\d{6}$/.test(normalizedOTP)) {
      setError('Enter the valid 6-digit verification code.')
      return
    }

    try {
      setAuthLoading(true)
      setError('')

      const data = await requestJSON(
        `${API_BASE}/auth/login/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: loginOTPIdentifier,
            otp: normalizedOTP,
          }),
        }
      )

      if (!data.token) {
        throw new Error(
          'Verification succeeded, but no login token was received.'
        )
      }

      sessionStorage.setItem(TOKEN_KEY, data.token)
      setToken(data.token)
      setUser(data.user)
      setLoginHistory([])
      setLoginOTPSent(false)
      setLoginOTPIdentifier('')
      setLoginOTP('')
      setLoginOTPMessage('')
      setActiveView('home')
      setError('')

      try {
        await fetchProfile(data.token)
      } catch {
        // Login can continue if profile history fails to load.
      }
    } catch (err) {
      setError(err.message || 'Could not verify the login code.')
    } finally {
      setAuthLoading(false)
    }
  }

  function backFromLoginOTP() {
    setLoginOTPSent(false)
    setLoginOTPIdentifier('')
    setLoginOTP('')
    setLoginOTPMessage('')
    setError('')
    setForm((current) => ({ ...current, password: '' }))
  }

  async function handleAuth(event) {
    event.preventDefault()
    if (authLoading) return

    try {
      setAuthLoading(true)
      setError('')

      if (authMode === 'register') {
        const username = form.username.trim().replace(/^@/, '')

        await requestJSON(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            username,
            email: form.email.trim(),
            password: form.password,
          }),
        })

        await loginUser(username, form.password)
      } else {
        await loginUser(form.identifier.trim(), form.password)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  // Forgot password API request
  async function handleForgotPassword(event) {
    event.preventDefault()
    if (forgotLoading) return

    const normalizedEmail = forgotEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      setForgotError('Please enter your registered email address.')
      setForgotMessage('')
      return
    }

    try {
      setForgotLoading(true)
      setForgotError('')
      setForgotMessage('')

      const data = await requestJSON(
        `${API_BASE}/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      )

      setForgotMessage(
        data.message ||
          'A temporary password has been sent to your registered email address.'
      )
    } catch (err) {
      setForgotError(err.message || 'Unable to reset your password.')
    } finally {
      setForgotLoading(false)
    }
  }

  function openForgotPassword() {
    setForgotEmail(form.identifier.includes('@') ? form.identifier : '')
    setForgotError('')
    setForgotMessage('')
    setShowForgotPassword(true)
  }

  function backToLogin() {
    setShowForgotPassword(false)
    setForgotError('')
    setForgotMessage('')
    setForgotLoading(false)
    setAuthMode('login')
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY)

    setToken('')
    setUser(null)
    setLoginHistory([])
    setPosts([])
    setPost('')
    setError('')
    setActiveView('home')
    setNewEmail('')
    setEmailOTP('')
    setEmailOTPSent(false)
    setEmailChangeMessage('')
    setEmailChangeError('')

    setLoginOTPSent(false)
    setLoginOTPIdentifier('')
    setLoginOTP('')
    setLoginOTPMessage('')

    setShowForgotPassword(false)
    setForgotEmail('')
    setForgotMessage('')
    setForgotError('')

    setForm({
      name: '',
      username: '',
      email: '',
      identifier: '',
      password: '',
    })

    setAuthMode('login')
  }

  async function fetchPosts() {
    try {
      setError('')
      setLoading(true)

      const data = await requestJSON(POSTS_URL)
      const fetchedPosts = Array.isArray(data.posts) ? data.posts : []

      setPosts(fetchedPosts)
    } catch (err) {
      setError(err.message || 'Could not load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoginHistory([])
      return
    }

    let cancelled = false

    async function verifySession() {
      try {
        const data = await requestJSON(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!cancelled) {
          setUser(data.user)
          setLoginHistory(
            Array.isArray(data.loginHistory) ? data.loginHistory : []
          )
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(TOKEN_KEY)
          setToken('')
          setUser(null)
          setLoginHistory([])
          setError('Your session expired. Please log in again.')
        }
      }
    }

    verifySession()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (user) fetchPosts()
  }, [user])

  // Browser notification permission and preference
  async function enableNotifications() {
    if (!('Notification' in window)) {
      setError('Your browser does not support notifications.')
      return
    }

    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setNotificationsEnabled(false)
        localStorage.setItem(NOTIFICATION_KEY, 'false')
        setError('Please allow browser notifications to use this feature.')
        return
      }

      setNotificationsEnabled(true)
      localStorage.setItem(NOTIFICATION_KEY, 'true')
      setError('')
    } catch {
      setError('Could not enable browser notifications.')
    }
  }

  function disableNotifications() {
    setNotificationsEnabled(false)
    localStorage.setItem(NOTIFICATION_KEY, 'false')
  }

  // Notify only for newly received posts containing cricket or science.
  useEffect(() => {
    if (!user || !notificationsEnabled || !('Notification' in window)) {
      return
    }

    if (Notification.permission !== 'granted') return

    if (firstPostsLoad.current) {
      posts.forEach((item) => {
        knownPostIds.current.add(String(item._id))
      })
      firstPostsLoad.current = false
      return
    }

    posts.forEach((item) => {
      const postId = String(item._id)

      if (knownPostIds.current.has(postId)) return

      knownPostIds.current.add(postId)

      const content = item.content || ''
      const matchesKeyword = /\b(cricket|science)\b/i.test(content)

      if (matchesKeyword) {
        new Notification('New PulseConnect post', {
          body: content,
          icon: '/vite.svg',
        })
      }
    })
  }, [posts, user, notificationsEnabled])

  // Check for new posts every 15 seconds.
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      requestJSON(POSTS_URL)
        .then((data) => {
          const fetchedPosts = Array.isArray(data.posts) ? data.posts : []
          setPosts(fetchedPosts)
        })
        .catch(() => {
          // Keep the existing feed if the refresh fails.
        })
    }, 15000)

    return () => clearInterval(interval)
  }, [user])

  async function createPost(event) {
    event.preventDefault()
    if (!post.trim() || submitting || !user || !token) return

    try {
      setSubmitting(true)
      setError('')

      const data = await requestJSON(POSTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: post.trim() }),
      })

      setPosts((currentPosts) => [data.post, ...currentPosts])
      setPost('')
    } catch (err) {
      setError(err.message || 'Could not create post')
    } finally {
      setSubmitting(false)
    }
  }

  async function openProfile() {
    setActiveView('profile')
    setError('')

    try {
      await fetchProfile(token)
    } catch (err) {
      setError(err.message || 'Could not load profile')
    }
  }

  function openSettings() {
    setActiveView('settings')
    setError('')
    setEmailChangeError('')
    setEmailChangeMessage('')
  }

  async function requestEmailChangeOTP(event) {
    event.preventDefault()
    if (emailChangeLoading) return

    const normalizedEmail = newEmail.trim().toLowerCase()

    if (!normalizedEmail) {
      setEmailChangeError('Please enter your new email address.')
      setEmailChangeMessage('')
      return
    }

    if (normalizedEmail === user?.email?.toLowerCase()) {
      setEmailChangeError(
        'Your new email must be different from your current email.'
      )
      setEmailChangeMessage('')
      return
    }

    try {
      setEmailChangeLoading(true)
      setEmailChangeError('')
      setEmailChangeMessage('')

      const data = await requestJSON(
        `${API_BASE}/auth/change-email/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newEmail: normalizedEmail }),
        }
      )

      setNewEmail(normalizedEmail)
      setEmailOTPSent(true)
      setEmailChangeMessage(
        data.message || 'OTP sent. Please check your new email address.'
      )
    } catch (err) {
      setEmailChangeError(
        err.message || 'Could not send the verification code.'
      )
    } finally {
      setEmailChangeLoading(false)
    }
  }

  async function verifyEmailChangeOTP(event) {
    event.preventDefault()
    if (emailChangeLoading) return

    const normalizedOTP = emailOTP.trim()

    if (!/^\d{6}$/.test(normalizedOTP)) {
      setEmailChangeError('Enter the valid 6-digit OTP.')
      setEmailChangeMessage('')
      return
    }

    try {
      setEmailChangeLoading(true)
      setEmailChangeError('')
      setEmailChangeMessage('')

      const data = await requestJSON(
        `${API_BASE}/auth/change-email/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ otp: normalizedOTP }),
        }
      )

      if (data.user) {
        setUser(data.user)
      } else {
        await fetchProfile(token)
      }

      setNewEmail('')
      setEmailOTP('')
      setEmailOTPSent(false)
      setEmailChangeMessage(
        data.message || 'Your registered email was updated successfully.'
      )
    } catch (err) {
      setEmailChangeError(err.message || 'Could not verify the OTP.')
    } finally {
      setEmailChangeLoading(false)
    }
  }

  function formatDate(value) {
    if (!value) return 'Unknown'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown'

    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  // Dedicated Forgot Password screen
  if (!user && showForgotPassword) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>Forgot your password?</h2>

          <p style={styles.muted}>
            Enter the email address registered with your PulseConnect
            account. We will send you a temporary password.
          </p>

          <form onSubmit={handleForgotPassword} style={styles.authForm}>
            <label style={styles.label} htmlFor="forgot-email">
              Registered email address
            </label>

            <input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(event) => {
                setForgotEmail(event.target.value)
                setForgotError('')
                setForgotMessage('')
              }}
              placeholder="Enter your registered email"
              autoComplete="email"
              maxLength={254}
              required
              style={styles.input}
            />

            {!forgotError && (
              <p style={styles.warningMessage}>
                You can use this option only one time per day.
              </p>
            )}

            {forgotError && (
              <p role="alert" style={styles.error}>
                {forgotError}
              </p>
            )}

            {forgotMessage && (
              <p role="status" style={styles.successMessage}>
                {forgotMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={forgotLoading}
              style={{
                ...styles.submitButton,
                opacity: forgotLoading ? 0.7 : 1,
              }}
            >
              {forgotLoading
                ? 'Sending temporary password...'
                : 'Send temporary password'}
            </button>
          </form>

          <button
            type="button"
            onClick={backToLogin}
            style={styles.backButton}
          >
            ← Back to Login
          </button>
        </section>
      </div>
    )
  }

  // Dedicated Chrome Login OTP screen
  if (!user && loginOTPSent) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>Verify your login</h2>

          <p style={styles.muted}>
            We sent a 6-digit verification code to your registered email
            address. Enter the code below to complete your Chrome login.
          </p>

          {loginOTPMessage && (
            <p role="status" style={styles.successMessage}>
              {loginOTPMessage}
            </p>
          )}

          <form onSubmit={verifyLoginOTP} style={styles.authForm}>
            <label style={styles.label} htmlFor="login-otp">
              6-digit verification code
            </label>

            <input
              id="login-otp"
              name="loginOTP"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={loginOTP}
              onChange={(event) => {
                setLoginOTP(
                  event.target.value.replace(/\D/g, '').slice(0, 6)
                )
                setError('')
              }}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              style={styles.input}
              autoFocus
            />

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading || loginOTP.length !== 6}
              style={{
                ...styles.submitButton,
                opacity:
                  authLoading || loginOTP.length !== 6 ? 0.7 : 1,
              }}
            >
              {authLoading ? 'Verifying...' : 'Verify OTP and Login'}
            </button>
          </form>

          <button
            type="button"
            onClick={backFromLoginOTP}
            disabled={authLoading}
            style={styles.backButton}
          >
            ← Back to Login
          </button>
        </section>
      </div>
    )
  }

  // Login and registration screen
  if (!user) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>
            {authMode === 'login'
              ? 'Welcome back!'
              : 'Create your account'}
          </h2>

          <p style={styles.muted}>
            {authMode === 'login'
              ? 'Log in to join the conversation.'
              : 'Join PulseConnect and share your world.'}
          </p>

          <div style={styles.modeButtons}>
            <button
              type="button"
              style={authMode === 'login' ? styles.activeMode : styles.mode}
              onClick={() => {
                setAuthMode('login')
                setError('')
              }}
            >
              Login
            </button>

            <button
              type="button"
              style={
                authMode === 'register' ? styles.activeMode : styles.mode
              }
              onClick={() => {
                setAuthMode('register')
                setError('')
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} style={styles.authForm}>
            {authMode === 'register' && (
              <>
                <label style={styles.label} htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder="Enter your name"
                  maxLength={50}
                  autoComplete="name"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={updateForm}
                  placeholder="Choose a username"
                  maxLength={30}
                  autoComplete="username"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={styles.input}
                />
              </>
            )}

            {authMode === 'login' && (
              <>
                <label style={styles.label} htmlFor="identifier">
                  Username or email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  value={form.identifier}
                  onChange={updateForm}
                  placeholder="Enter username or email"
                  autoComplete="username"
                  required
                  style={styles.input}
                />
              </>
            )}

            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={updateForm}
              placeholder="Enter your password"
              autoComplete={
                authMode === 'login' ? 'current-password' : 'new-password'
              }
              required
              style={styles.input}
            />

            {authMode === 'login' && (
              <div style={styles.forgotLinkRow}>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  style={styles.forgotLink}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                ...styles.submitButton,
                opacity: authLoading ? 0.7 : 1,
              }}
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Login →'
                  : 'Create account →'}
            </button>
          </form>

          <p style={styles.switchText}>
            {authMode === 'login'
              ? "Don't have an account? "
              : 'Already registered? '}
            <button
              type="button"
              style={styles.switchButton}
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {authMode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
        </section>
      </div>
    )
  }

  const initial = user.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="logo">
          Pulse<span>Connect</span>
        </h1>

        <nav>
          <button
            type="button"
            className={activeView === 'home' ? 'active' : ''}
            style={styles.navButton}
            onClick={() => {
              setActiveView('home')
              setError('')
            }}
          >
            ⌂ Home
          </button>

          <button
            type="button"
            className="nav-button"
            style={styles.navButton}
            onClick={() => {
              setActiveView('home')
              setError('')
            }}
          >
            ▤ Explore
          </button>

          <button
            type="button"
            className="nav-button"
            style={styles.navButton}
            onClick={() => {
              setActiveView('home')
              setError('')
            }}
          >
            ♧ Notifications
          </button>

          <button
            type="button"
            className={activeView === 'profile' ? 'active' : ''}
            style={styles.navButton}
            onClick={openProfile}
          >
            ♙ Profile
          </button>

          <button
            type="button"
            className={activeView === 'plans' ? 'active' : ''}
            style={styles.navButton}
            onClick={() => {
              setActiveView('plans')
              setError('')
            }}
          >
            ◈ Subscription Plans
          </button>

          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            style={styles.navButton}
            onClick={openSettings}
          >
            ⚙ Settings
          </button>
        </nav>

        <p className="sidebar-footer">Connect. Share. Belong.</p>
      </aside>

      <main className="feed" id="home">
        <header style={styles.topbar}>
          <div style={styles.topbarTitle}>
            <h2>
              {activeView === 'profile'
                ? 'Your Profile'
                : activeView === 'settings'
                  ? 'Settings'
                  : activeView === 'plans'
                    ? 'Subscription Plans'
                    : 'Home Feed'}
            </h2>
            <p>
              {activeView === 'profile'
                ? 'Your account details and recent logins.'
                : activeView === 'settings'
                  ? 'Manage your PulseConnect experience.'
                  : activeView === 'plans'
                    ? 'Choose a plan that fits your conversations.'
                    : 'Your world, in real time.'}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={styles.logoutButton}
            aria-label="Log out of PulseConnect"
          >
            Log out
          </button>

          <button
            type="button"
            aria-label="Open profile"
            style={styles.avatarButton}
            onClick={openProfile}
          >
            <span className="avatar">{initial}</span>
          </button>
        </header>

        {error && (
          <p role="alert" style={styles.globalError}>
            {error}
          </p>
        )}
                {activeView === 'profile' ? (
          <section style={styles.profileSection}>
            <div style={styles.profileCard}>
              <div style={styles.profileAvatar}>{initial}</div>
              <div>
                <h2 style={styles.profileName}>{user.name}</h2>
                <p style={styles.profileUsername}>@{user.username}</p>
              </div>
            </div>

            <div style={styles.detailsCard}>
              <h3>Account details</h3>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Full name</span>
                <strong>{user.name || 'Not available'}</strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Username</span>
                <strong>@{user.username || 'Not available'}</strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Email</span>
                <strong style={styles.breakText}>
                  {user.email || 'Not available'}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Subscription</span>
                <strong style={styles.subscriptionBadge}>
                  {user.subscription || 'Free'}
                </strong>
              </div>

              {user.createdAt && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Member since</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>
              )}

              <button
                type="button"
                style={{ ...styles.refreshButton, marginTop: 16 }}
                onClick={openSettings}
              >
                Change registered email
              </button>
            </div>

            <div style={styles.detailsCard}>
              <div style={styles.historyHeader}>
                <div>
                  <h3 style={{ marginBottom: 5 }}>Login History</h3>
                  <p style={styles.muted}>
                    Your 10 most recent successful logins
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.refreshButton}
                  disabled={profileLoading}
                  onClick={() =>
                    fetchProfile(token).catch((err) => setError(err.message))
                  }
                >
                  {profileLoading ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>

              {profileLoading ? (
                <p style={styles.emptyState}>
                  Loading your login history...
                </p>
              ) : loginHistory.length === 0 ? (
                <p style={styles.emptyState}>
                  No login records found yet. Log out and log in again to
                  create a new record.
                </p>
              ) : (
                <div style={styles.historyList}>
                  {loginHistory.map((entry) => (
                    <article
                      key={entry._id || `${entry.loggedInAt}-${entry.browser}`}
                      style={styles.historyItem}
                    >
                      <div style={styles.historyIcon}>↗</div>
                      <div style={styles.historyInfo}>
                        <strong>{entry.browser || 'Unknown browser'}</strong>
                        <p style={styles.historyMeta}>
                          {entry.operatingSystem || 'Unknown OS'}
                          {' · '}
                          {entry.deviceCategory || 'Unknown device'}
                        </p>
                        <p style={styles.historyMeta}>
                          IP address: {entry.ipAddress || 'Unknown'}
                        </p>
                        <p style={styles.historyDate}>
                          {formatDate(entry.loggedInAt)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : activeView === 'plans' ? (
          <section style={styles.profileSection}>
            <div style={styles.detailsCard}>
              <h3 style={{ marginTop: 0 }}>Choose your PulseConnect plan</h3>
              <p style={styles.muted}>
                Plans are valid for 30 days. Your monthly tweet quota follows
                the Indian Standard Time calendar month.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: 14,
                  marginTop: 20,
                }}
              >
                {[
                  {
                    name: 'Free',
                    price: '₹0',
                    quota: '1 tweet / month',
                    note: 'For getting started',
                  },
                  {
                    name: 'Bronze',
                    price: '₹100',
                    quota: '3 tweets / month',
                    note: 'For casual conversations',
                  },
                  {
                    name: 'Silver',
                    price: '₹300',
                    quota: '5 tweets / month',
                    note: 'For more regular sharing',
                  },
                  {
                    name: 'Gold',
                    price: '₹1,000',
                    quota: 'Unlimited tweets',
                    note: 'For unlimited sharing',
                  },
                ].map((plan) => {
                  const current =
                    (user.subscription || 'Free') === plan.name

                  return (
                    <article
                      key={plan.name}
                      style={{
                        border: current
                          ? '2px solid #5546e8'
                          : '1px solid #e7eaf1',
                        borderRadius: 12,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <h4 style={{ margin: 0, fontSize: 18 }}>
                          {plan.name}
                        </h4>

                        {current && (
                          <span
                            style={{
                              color: '#5546e8',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            CURRENT PLAN
                          </span>
                        )}
                      </div>

                      <div>
                        <strong style={{ fontSize: 27 }}>
                          {plan.price}
                        </strong>
                        {plan.name !== 'Free' && (
                          <span style={styles.muted}> / 30 days</span>
                        )}
                      </div>

                      <strong>{plan.quota}</strong>

                      <p style={{ ...styles.muted, margin: 0 }}>
                        {plan.note}
                      </p>

                      <button
                        type="button"
                        disabled
                        style={{
                          ...styles.submitButton,
                          marginTop: 'auto',
                          opacity: 0.65,
                          cursor: 'not-allowed',
                        }}
                      >
                        {current
                          ? 'Current plan'
                          : 'Payment setup pending'}
                      </button>
                    </article>
                  )
                })}
              </div>

              <p
                style={{
                  ...styles.muted,
                  marginTop: 18,
                  fontSize: 12,
                }}
              >
                Payment checkout is not enabled from this screen yet.
                No payment has been taken.
              </p>
            </div>
          </section>
        ) : activeView === 'settings' ? (
          <section style={styles.profileSection}>
            <div style={styles.detailsCard}>
              <h3>Account Settings</h3>
              <p style={styles.muted}>
                Change your registered email address. A verification code
                must be confirmed before your account email is updated.
              </p>

              <div style={{ marginTop: 20, marginBottom: 20 }}>
                <span style={styles.detailLabel}>
                  Current registered email
                </span>
                <p style={{ ...styles.breakText, fontWeight: 600 }}>
                  {user.email || 'Not available'}
                </p>
              </div>

              <form
                onSubmit={
                  emailOTPSent
                    ? verifyEmailChangeOTP
                    : requestEmailChangeOTP
                }
                style={styles.authForm}
              >
                {!emailOTPSent ? (
                  <>
                    <label style={styles.label} htmlFor="new-email">
                      New email address
                    </label>
                    <input
                      id="new-email"
                      name="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value)
                        setEmailChangeError('')
                        setEmailChangeMessage('')
                      }}
                      placeholder="Enter your new email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      style={styles.input}
                    />

                    <button
                      type="submit"
                      disabled={emailChangeLoading}
                      style={{
                        ...styles.submitButton,
                        opacity: emailChangeLoading ? 0.7 : 1,
                      }}
                    >
                      {emailChangeLoading
                        ? 'Sending OTP...'
                        : 'Send verification OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={styles.muted}>
                      Enter the 6-digit verification code sent to:
                    </p>
                    <strong style={styles.breakText}>{newEmail}</strong>

                    <label style={styles.label} htmlFor="email-change-otp">
                      Verification code
                    </label>
                    <input
                      id="email-change-otp"
                      name="emailOTP"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={emailOTP}
                      onChange={(event) => {
                        setEmailOTP(
                          event.target.value.replace(/\D/g, '').slice(0, 6)
                        )
                        setEmailChangeError('')
                      }}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      style={styles.input}
                    />

                    <button
                      type="submit"
                      disabled={
                        emailChangeLoading || emailOTP.length !== 6
                      }
                      style={{
                        ...styles.submitButton,
                        opacity:
                          emailChangeLoading || emailOTP.length !== 6
                            ? 0.7
                            : 1,
                      }}
                    >
                      {emailChangeLoading
                        ? 'Verifying...'
                        : 'Verify OTP and update email'}
                    </button>

                    <button
                      type="button"
                      disabled={emailChangeLoading}
                      style={styles.refreshButton}
                      onClick={() => {
                        setEmailOTPSent(false)
                        setEmailOTP('')
                        setEmailChangeError('')
                        setEmailChangeMessage('')
                      }}
                    >
                      Use a different email
                    </button>
                  </>
                )}
              </form>

              {emailChangeError && (
                <p role="alert" style={styles.error}>
                  {emailChangeError}
                </p>
              )}

              {emailChangeMessage && (
                <p role="status" style={styles.successMessage}>
                  {emailChangeMessage}
                </p>
              )}

              <button
                type="button"
                style={{ ...styles.refreshButton, marginTop: 12 }}
                onClick={openProfile}
              >
                Back to profile
              </button>
            </div>

            {/* Browser notification preferences */}
            <div style={styles.detailsCard}>
              <h3>Browser Notifications</h3>
              <p style={styles.muted}>
                Receive the full text of new posts containing the words
                cricket or science.
              </p>

              <p style={{ marginTop: 16 }}>
                Status:{' '}
                <strong>
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </strong>
              </p>

              {!notificationsEnabled ? (
                <button
                  type="button"
                  style={styles.submitButton}
                  onClick={enableNotifications}
                >
                  Enable Browser Notifications
                </button>
              ) : (
                <button
                  type="button"
                  style={styles.refreshButton}
                  onClick={disableNotifications}
                >
                  Disable Browser Notifications
                </button>
              )}

              {typeof Notification !== 'undefined' &&
                Notification.permission === 'denied' && (
                  <p style={styles.error}>
                    Notifications are blocked in browser settings. Allow
                    notifications for this website in your browser.
                  </p>
                )}
            </div>
          </section>
        ) : (
          <>
            <div style={styles.welcome}>
              Logged in as <strong>{user.name}</strong> (@{user.username})
            </div>

            <AudioTweets token={token} />

            <form className="composer" onSubmit={createPost}>
              <div className="avatar">{initial}</div>
              <div className="composer-body">
                <textarea
                  value={post}
                  onChange={(event) => setPost(event.target.value)}
                  placeholder="What's happening?"
                  maxLength={280}
                  aria-label="Write a post"
                />
                <div className="composer-bottom">
                  <span>{post.length}/280</span>
                  <button
                    type="submit"
                    disabled={!post.trim() || submitting}
                  >
                    {submitting ? 'Posting...' : 'Post →'}
                  </button>
                </div>
              </div>
            </form>

            <div className="feed-heading" id="feed">
              <h3>Latest posts</h3>
              <span>For you</span>
            </div>

            {loading ? (
              <p style={{ padding: 24 }}>Loading posts...</p>
            ) : posts.length === 0 ? (
              <p style={{ padding: 24 }}>
                No posts yet. Be the first to post!
              </p>
            ) : (
              posts.map((item) => (
                <article className="post-card" key={item._id}>
                  <div className="avatar">
                    {item.author?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="post-content">
                    <div className="post-author">
                      <strong>{item.author}</strong>
                      <span>@{item.username}</span>
                    </div>
                    <p>{item.content}</p>
                    <div className="post-actions">
                      <span>♡ {item.likes} Likes</span>
                      <span>◯ Reply</span>
                      <span>↗ Share</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </>
        )}
      </main>

      <aside className="rightbar">
        <section className="info-card">
          <h3>About PulseConnect</h3>
          <p>A place for conversations, communities, and new ideas.</p>
        </section>

        <section className="info-card">
          <h3>
            {activeView === 'profile' ? 'Account security' : "What's next?"}
          </h3>
          <p>
            {activeView === 'profile'
              ? 'Review recent logins and contact support if you see activity you do not recognize.'
              : 'Profiles, subscriptions, audio posts, notifications, and more.'}
          </p>
        </section>

        <p className="copyright">© 2026 PulseConnect</p>
      </aside>
    </div>
  )
}

const styles = {
  authPage: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    background: '#f4f6fb',
    fontFamily: 'Arial, sans-serif',
  },
  authCard: {
    width: '100%',
    maxWidth: 430,
    padding: 32,
    borderRadius: 18,
    background: '#ffffff',
    boxShadow: '0 12px 40px rgba(25, 35, 70, 0.10)',
    boxSizing: 'border-box',
  },
  authLogo: { marginTop: 0, marginBottom: 28, fontSize: 28 },
  muted: { color: '#687386', lineHeight: 1.5, marginTop: 0 },
  modeButtons: { display: 'flex', gap: 8, margin: '24px 0' },
  mode: {
    flex: 1,
    padding: 11,
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    cursor: 'pointer',
  },
  activeMode: {
    flex: 1,
    padding: 11,
    border: '1px solid #5546e8',
    borderRadius: 8,
    background: '#5546e8',
    color: '#ffffff',
    cursor: 'pointer',
  },
  authForm: { display: 'flex', flexDirection: 'column', gap: 9 },
  label: { fontSize: 14, fontWeight: 600, marginTop: 5 },
  input: {
    width: '100%',
    padding: '12px 13px',
    border: '1px solid #dce1eb',
    borderRadius: 8,
    fontSize: 15,
    boxSizing: 'border-box',
    outlineColor: '#5546e8',
  },
  submitButton: {
    padding: 13,
    marginTop: 12,
    border: 'none',
    borderRadius: 8,
    background: '#5546e8',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
  error: {
    color: '#c62828',
    background: '#fff0f0',
    padding: 10,
    borderRadius: 7,
    fontSize: 14,
    overflowWrap: 'anywhere',
  },
  successMessage: {
    color: '#246b45',
    background: '#edf8f0',
    padding: 10,
    borderRadius: 7,
    fontSize: 14,
    overflowWrap: 'anywhere',
  },
  warningMessage: {
    color: '#8a5b00',
    background: '#fff7e6',
    border: '1px solid #f3dfad',
    padding: 11,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '5px 0',
  },
  forgotLinkRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: -2,
  },
  forgotLink: {
    border: 'none',
    background: 'transparent',
    color: '#5546e8',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    padding: '5px 0',
  },
  backButton: {
    width: '100%',
    marginTop: 18,
    padding: 11,
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    color: '#30384a',
    fontWeight: 600,
    cursor: 'pointer',
  },
  switchText: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: '#687386',
  },
  switchButton: {
    border: 'none',
    background: 'transparent',
    color: '#5546e8',
    fontWeight: 700,
    cursor: 'pointer',
  },
  globalError: {
    color: '#c62828',
    padding: '0 24px',
    overflowWrap: 'anywhere',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '20px 24px',
    borderBottom: '1px solid #e7eaf1',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    minWidth: 0,
  },
  topbarTitle: { flex: '1 1 auto', minWidth: 0 },
  logoutButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    position: 'relative',
    zIndex: 5,
    visibility: 'visible',
    opacity: 1,
    padding: '10px 16px',
    minWidth: 90,
    minHeight: 40,
    border: '1px solid #5546e8',
    borderRadius: 8,
    backgroundColor: '#5546e8',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  avatarButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
  },
  navButton: {
    display: 'block',
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
    padding: '10px 12px',
    borderRadius: 8,
  },
  welcome: { padding: '12px 24px', fontSize: 14, color: '#687386' },
  profileSection: {
    padding: '20px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 22,
    background: '#ffffff',
    border: '1px solid #e7eaf1',
    borderRadius: 14,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#5546e8',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    flexShrink: 0,
  },
  profileName: { margin: '0 0 5px', fontSize: 22 },
  profileUsername: { margin: 0, color: '#687386' },
  detailsCard: {
    padding: 22,
    background: '#ffffff',
    border: '1px solid #e7eaf1',
    borderRadius: 14,
    minWidth: 0,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '13px 0',
    borderBottom: '1px solid #eef0f5',
    fontSize: 14,
  },
  detailLabel: { color: '#687386', flexShrink: 0 },
  breakText: { overflowWrap: 'anywhere', textAlign: 'right' },
  subscriptionBadge: {
    padding: '4px 10px',
    borderRadius: 20,
    background: '#efedff',
    color: '#5546e8',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  refreshButton: {
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    color: '#30384a',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  emptyState: { padding: '18px 0', color: '#687386', lineHeight: 1.6 },
  historyList: { display: 'flex', flexDirection: 'column' },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '17px 0',
    borderTop: '1px solid #eef0f5',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#f0efff',
    color: '#5546e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  historyInfo: { minWidth: 0, overflowWrap: 'anywhere' },
  historyMeta: { margin: '5px 0 0', color: '#687386', fontSize: 13 },
  historyDate: {
    margin: '7px 0 0',
    color: '#30384a',
    fontSize: 13,
    fontWeight: 600,
  },
}

export default App
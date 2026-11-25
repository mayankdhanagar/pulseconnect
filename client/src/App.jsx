import { useCallback, useEffect, useRef, useState } from 'react'
import AudioTweets from './AudioTweets'
import PaymentCheckout from './PaymentCheckout'
import { translate } from './translations'
import LanguageSettings from './LanguageSettings'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const POSTS_URL = API_BASE + '/posts'

const TOKEN_KEY = 'pulseconnect_token'
const NOTIFICATION_KEY = 'pulseconnect_notifications'
const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID
const MSG91_TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH

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
  const [language, setLanguage] = useState('English')

  // Keep the selected language in sync with child components.
  const handleLanguageChange = useCallback((newLanguage) => {
    if (typeof newLanguage === 'string' && newLanguage.trim()) {
      setLanguage(newLanguage)
    }
  }, [])

function t(key) {
  return translate(language, key, 'app')
}
  const [loginHistory, setLoginHistory] = useState([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [activeView, setActiveView] = useState('home')
  const [paymentNotice, setPaymentNotice] = useState(null)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)

  // Browser notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const knownPostIds = useRef(new Set())
  const firstPostsLoad = useRef(true)
  // Do not send notifications until the initial feed has loaded.
  const [postsInitialized, setPostsInitialized] = useState(false)

  // Chrome login OTP state
  const [loginOTPSent, setLoginOTPSent] = useState(false)
  const [loginOTPIdentifier, setLoginOTPIdentifier] = useState('')
  const [loginOTP, setLoginOTP] = useState('')
  const [loginOTPMessage, setLoginOTPMessage] = useState('')

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotPhone, setForgotPhone] = useState('')
  const [forgotMethod, setForgotMethod] = useState('email')
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


  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('')
  const [passwordChangeError, setPasswordChangeError] = useState('')

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
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

    const data = await requestJSON(API_BASE + '/auth/me', {
      headers: {
        Authorization: 'Bearer ' + currentToken,
      },
    })

    setUser(data.user)

    // Load saved browser notification preference
    const savedPreference = Boolean(data.user.notificationsEnabled)
    setNotificationsEnabled(savedPreference)
    localStorage.setItem(NOTIFICATION_KEY, String(savedPreference))

    setLoginHistory(
      Array.isArray(data.loginHistory) ? data.loginHistory : []
    )
  } finally {
    setProfileLoading(false)
  }
}, [token])

  // Fetch payment history
  const fetchPaymentHistory = useCallback(async () => {
    if (!token) return

    try {
      setPaymentsLoading(true)
      setPaymentsError('')

      const response = await fetch(API_BASE + '/payments/history', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load payment history.')
      }

      setPayments(Array.isArray(data.payments) ? data.payments : [])
    } catch (err) {
      setPaymentsError(err.message || 'Could not load payment history.')
    } finally {
      setPaymentsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeView === 'plans' && token) {
      fetchPaymentHistory()
    }
  }, [activeView, token, fetchPaymentHistory])

  // Load the user's saved language preference.
useEffect(() => {
  if (!token) {
    setLanguage('English')
    return
  }

  let cancelled = false

  async function loadLanguage() {
    try {
      const data = await requestJSON(API_BASE + '/language/current', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      })

      if (!cancelled) {
        const savedLanguage = data.preferredLanguage || data.language || 'English'
        setLanguage(savedLanguage)
      }
    } catch (err) {
      console.error('Could not load saved language:', err)
    }
  }

  loadLanguage()

  return () => {
    cancelled = true
  }
}, [token])

  async function loginUser(identifier, password) {
    const data = await requestJSON(API_BASE + '/auth/login', {
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
        API_BASE + '/auth/login/verify-otp',
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

        await requestJSON(API_BASE + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            username,
            email: form.email.trim(),
            phone: form.phone.trim(),
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

  // Email-based password reset.
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

      const data = await requestJSON(API_BASE + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })

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

  // Load and open the same MSG91 widget used by Language Settings.
  function openForgotPasswordMSG91Widget(identifier) {
    if (!MSG91_WIDGET_ID || !MSG91_TOKEN_AUTH) {
      throw new Error(
        'MSG91 widget is not configured. Check VITE_MSG91_WIDGET_ID and VITE_MSG91_TOKEN_AUTH in client/.env.'
      )
    }

    const configuration = {
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_TOKEN_AUTH,
      identifier,
      exposeMethods: false,

      success: async (widgetData) => {
        try {
          setForgotLoading(true)
          setForgotError('')
          setForgotMessage('Mobile verified. Preparing your temporary password...')

          const accessToken =
            widgetData?.['access-token'] ||
            widgetData?.accessToken ||
            widgetData?.access_token ||
            widgetData?.token ||
            widgetData?.message

          if (typeof accessToken !== 'string' || !accessToken) {
            throw new Error('MSG91 did not return a verification token. Please try again.')
          }

          const verification = await requestJSON(
            API_BASE + '/auth/forgot-password/verify-mobile-token',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            }
          )

          if (!verification.resetToken) {
            throw new Error('Mobile verification did not return a reset token.')
          }

          const reset = await requestJSON(
            API_BASE + '/auth/forgot-password/reset-with-mobile',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resetToken: verification.resetToken }),
            }
          )

          setForgotMessage(
            reset.message ||
              'A temporary password has been sent to your registered email address.'
          )
        } catch (err) {
          setForgotError(err.message || 'Could not complete mobile password reset.')
          setForgotMessage('')
        } finally {
          setForgotLoading(false)
        }
      },

      failure: (widgetError) => {
        console.error('Forgot-password MSG91 widget error:', widgetError)
        setForgotError('Mobile OTP verification failed. Please try again.')
        setForgotMessage('')
        setForgotLoading(false)
      },
    }

    if (typeof window.initSendOTP === 'function') {
      window.initSendOTP(configuration)
      return
    }

    const existingScript = document.querySelector(
      'script[data-msg91-widget="true"]'
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (typeof window.initSendOTP === 'function') {
          window.initSendOTP(configuration)
        } else {
          setForgotError('MSG91 widget could not be initialized.')
        }
      }, { once: true })
      existingScript.addEventListener('error', () => {
        setForgotError('Could not load MSG91 widget. Please try again.')
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://verify.msg91.com/otp-provider.js'
    script.async = true
    script.dataset.msg91Widget = 'true'
    script.onload = () => {
      if (typeof window.initSendOTP === 'function') {
        window.initSendOTP(configuration)
      } else {
        setForgotError('MSG91 widget could not be initialized.')
      }
    }
    script.onerror = () => {
      setForgotError('Could not load MSG91 widget. Please try again.')
    }
    document.body.appendChild(script)
  }

  // Request mobile verification before allowing a reset.
  async function handleForgotPasswordByPhone(event) {
    event.preventDefault()
    if (forgotLoading) return

    const digits = forgotPhone.replace(/\D/g, '')
    const normalizedPhone =
      digits.length === 10 ? digits : digits.startsWith('91') && digits.length === 12
        ? digits.slice(2)
        : ''

    if (!/^\d{10}$/.test(normalizedPhone)) {
      setForgotError('Please enter a valid 10-digit Indian mobile number.')
      setForgotMessage('')
      return
    }

    try {
      setForgotLoading(true)
      setForgotError('')
      setForgotMessage('')

      const data = await requestJSON(
        API_BASE + '/auth/forgot-password/request-mobile-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalizedPhone }),
        }
      )

      setForgotMessage('Opening secure mobile verification...')
      openForgotPasswordMSG91Widget(data.identifier || '91' + normalizedPhone)
    } catch (err) {
      setForgotError(err.message || 'Could not start mobile verification.')
    } finally {
      setForgotLoading(false)
    }
  }

  function openForgotPassword() {
    setForgotEmail(form.identifier.includes('@') ? form.identifier : '')
    setForgotPhone('')
    setForgotMethod('email')
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
    setNotificationsEnabled(false)
    knownPostIds.current.clear()
    firstPostsLoad.current = true
    setPostsInitialized(false)
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
    setForgotPhone('')
    setForgotMessage('')
    setForgotError('')

    setForm({
      name: '',
      username: '',
      email: '',
      phone: '',
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
      setPostsInitialized(true)
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
        const data = await requestJSON(API_BASE + '/auth/me', {
          headers: { Authorization: 'Bearer ' + token },
        })

        if (!cancelled) {
          setUser(data.user)
          const savedPreference = Boolean(data.user.notificationsEnabled)
          setNotificationsEnabled(savedPreference)
          localStorage.setItem(NOTIFICATION_KEY, String(savedPreference))
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

  // Show the result after returning from PayU hosted checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')

    if (!paymentStatus) return

    setActiveView('plans')

    if (paymentStatus === 'success') {
      setPaymentNotice({ type: 'success' })
    } else if (paymentStatus === 'failed') {
      setPaymentNotice({ type: 'error' })
    } else {
      setPaymentNotice({ type: 'warning' })
    }

    window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  useEffect(() => {
    if (user) fetchPosts()
  }, [user])

  // Save browser notification preference in the backend database.
  async function saveNotificationPreference(enabled) {
    if (!token) {
      throw new Error('Please log in again to update notification settings.')
    }

    const data = await requestJSON(API_BASE + '/notifications/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ enabled }),
    })

    const savedValue = typeof data.notificationsEnabled === 'boolean'
      ? data.notificationsEnabled
      : typeof data.enabled === 'boolean'
        ? data.enabled
        : enabled

    setNotificationsEnabled(savedValue)
    localStorage.setItem(NOTIFICATION_KEY, String(savedValue))
    return savedValue
  }

  // Browser notification permission and saved preference.
  async function enableNotifications() {
    if (!('Notification' in window)) {
      setError('Your browser does not support notifications.')
      return
    }

    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setError('Please allow browser notifications to use this feature.')
        return
      }

      await saveNotificationPreference(true)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not save browser notification settings.')
    }
  }

  async function disableNotifications() {
    try {
      await saveNotificationPreference(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not save browser notification settings.')
    }
  }

  // Notify only for newly received posts containing cricket or science.
  useEffect(() => {
    if (!user || !postsInitialized || !notificationsEnabled || !('Notification' in window)) {
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
  }, [posts, user, notificationsEnabled, postsInitialized])

  // Check for new posts every 15 seconds.
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      requestJSON(POSTS_URL)
        .then((data) => {
          const fetchedPosts = Array.isArray(data.posts) ? data.posts : []
          setPosts(fetchedPosts)
          setPostsInitialized(true)
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
          Authorization: 'Bearer ' + token,
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
        API_BASE + '/auth/change-email/request',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
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
        API_BASE + '/auth/change-email/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
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

  // Change password using the existing backend endpoint.
  async function handleChangePassword(event) {
    event.preventDefault()
    if (passwordChangeLoading) return

    setPasswordChangeError('')
    setPasswordChangeMessage('')

    if (!currentPassword) {
      setPasswordChangeError(t('passwordErrorCurrentRequired'))
      return
    }
    if (newPassword.length < 8) {
      setPasswordChangeError(t('passwordErrorMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError(t('passwordErrorMismatch'))
      return
    }
    if (newPassword === currentPassword) {
      setPasswordChangeError(t('passwordErrorSame'))
      return
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setPasswordChangeError(t('passwordErrorTooLong'))
      return
    }

    try {
      setPasswordChangeLoading(true)
      const data = await requestJSON(API_BASE + '/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (data.user) {
        setUser((previousUser) => ({
          ...previousUser,
          ...data.user,
          mustChangePassword: false,
        }))
      } else {
        setUser((previousUser) => ({ ...previousUser, mustChangePassword: false }))
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordChangeMessage(t('passwordChanged'))
    } catch (err) {
      setPasswordChangeError(t('passwordChangeFailed'))
    } finally {
      setPasswordChangeLoading(false)
    }
  }

  function translatePaymentStatus(status) {
    if (status === 'Success') return t('statusSuccess')
    if (status === 'Failed') return t('statusFailed')
    if (status === 'Pending') return t('statusPending')
    return status || t('unknown')
  }

  function formatDate(value) {
    if (!value) return t('unknown')

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return t('unknown')

    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  // Users who received a temporary password must change it before continuing.
  if (user?.mustChangePassword === true) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>
          <h2 style={{ marginBottom: 8 }}>{t('changeTemporaryPasswordTitle')}</h2>
          <p style={styles.muted}>
            {t('temporaryPasswordDescription')}
          </p>
          <form onSubmit={handleChangePassword} style={styles.authForm}>
            <label style={styles.label} htmlFor="temporary-current-password">{t('temporaryPasswordLabel')}</label>
            <input id="temporary-current-password" type="password" value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password"
              required style={styles.input} />
            <label style={styles.label} htmlFor="temporary-new-password">{t('newPasswordLabel')}</label>
            <input id="temporary-new-password" type="password" value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password"
              minLength={8} maxLength={72} required style={styles.input} />
            <label style={styles.label} htmlFor="temporary-confirm-password">{t('confirmNewPasswordLabel')}</label>
            <input id="temporary-confirm-password" type="password" value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password"
              minLength={8} maxLength={72} required style={styles.input} />
            {passwordChangeError && <p role="alert" style={styles.error}>{passwordChangeError}</p>}
            {passwordChangeMessage && <p role="status" style={styles.successMessage}>{passwordChangeMessage}</p>}
            <button type="submit" disabled={passwordChangeLoading} style={{ ...styles.submitButton, opacity: passwordChangeLoading ? 0.7 : 1 }}>
              {passwordChangeLoading ? t('changingPassword') : t('saveNewPassword')}
            </button>
          </form>
          <button type="button" onClick={logout} style={styles.backButton}>{t('logout')}</button>
        </section>
      </div>
    )
  }

  // Dedicated Forgot Password screen: email OR registered mobile.
  if (!user && showForgotPassword) {
    return (
      <div style={styles.authPage}>
        <section style={styles.authCard}>
          <h1 className="logo" style={styles.authLogo}>
            Pulse<span>Connect</span>
          </h1>

          <h2 style={{ marginBottom: 8 }}>{t('forgotPassword')}</h2>
          <p style={styles.muted}>
            Choose email or mobile number registered with your PulseConnect account.
          </p>

          <div style={{ display: 'flex', gap: 10, margin: '18px 0' }}>
            <button
              type="button"
              onClick={() => {
                setForgotMethod('email')
                setForgotError('')
                setForgotMessage('')
              }}
              style={{
                ...styles.submitButton,
                flex: 1,
                background: forgotMethod === 'email' ? '#5746e8' : '#ffffff',
                color: forgotMethod === 'email' ? '#ffffff' : '#273044',
                border: '1px solid #d7dceb',
              }}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotMethod('phone')
                setForgotError('')
                setForgotMessage('')
              }}
              style={{
                ...styles.submitButton,
                flex: 1,
                background: forgotMethod === 'phone' ? '#5746e8' : '#ffffff',
                color: forgotMethod === 'phone' ? '#ffffff' : '#273044',
                border: '1px solid #d7dceb',
              }}
            >
              Mobile number
            </button>
          </div>

          {forgotMethod === 'email' ? (
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
              <button
                type="submit"
                disabled={forgotLoading}
                style={{ ...styles.submitButton, opacity: forgotLoading ? 0.7 : 1 }}
              >
                {forgotLoading ? 'Sending...' : 'Send temporary password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPasswordByPhone} style={styles.authForm}>
              <label style={styles.label} htmlFor="forgot-phone">
                Registered mobile number
              </label>
              <input
                id="forgot-phone"
                type="tel"
                inputMode="numeric"
                value={forgotPhone}
                onChange={(event) => {
                  setForgotPhone(event.target.value)
                  setForgotError('')
                  setForgotMessage('')
                }}
                placeholder="Enter your 10-digit mobile number"
                autoComplete="tel"
                maxLength={14}
                required
                style={styles.input}
              />
              <p style={styles.muted}>
                We will verify this number with an OTP using MSG91. After successful verification, the temporary password will be sent to your registered email.
              </p>
              <button
                type="submit"
                disabled={forgotLoading}
                style={{ ...styles.submitButton, opacity: forgotLoading ? 0.7 : 1 }}
              >
                {forgotLoading ? 'Please wait...' : 'Verify mobile and reset password'}
              </button>
            </form>
          )}

          <p style={styles.warningMessage}>
            {t('oneTimeDaily')}
          </p>

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

          <button type="button" onClick={backToLogin} style={styles.backButton}>
            {t('backLogin')}
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

          <h2 style={{ marginBottom: 8 }}>{t('verifyLogin')}</h2>

          <p style={styles.muted}>
            {t('loginCodeText')}
          </p>

          {loginOTPMessage && (
            <p role="status" style={styles.successMessage}>
              {loginOTPMessage}
            </p>
          )}

          <form onSubmit={verifyLoginOTP} style={styles.authForm}>
            <label style={styles.label} htmlFor="login-otp">
              {t('sixDigitCode')}
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
              placeholder={t('enterOtp')}
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
              {authLoading ? t('verifying') : t('verifyLoginButton')}
            </button>
          </form>

          <button
            type="button"
            onClick={backFromLoginOTP}
            disabled={authLoading}
            style={styles.backButton}
          >
            {t('backLogin')}
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
              ? t('welcomeBack')
              : t('createAccount')}
          </h2>

          <p style={styles.muted}>
            {authMode === 'login'
              ? t('loginText')
              : t('registerText')}
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
              {t('login')}
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
              {t('register')}
            </button>
          </div>

          <form onSubmit={handleAuth} style={styles.authForm}>
            {authMode === 'register' && (
              <>
                <label style={styles.label} htmlFor="name">
                  {t('fullName')}
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder={t('enterName')}
                  maxLength={50}
                  autoComplete="name"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="username">
                  {t('username')}
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={updateForm}
                  placeholder={t('chooseUsername')}
                  maxLength={30}
                  autoComplete="username"
                  required
                  style={styles.input}
                />

                <label style={styles.label} htmlFor="register-email">
                  {t('email')}
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

                <label style={styles.label} htmlFor="register-phone">
                  {t('mobile')}
                </label>
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateForm}
                  placeholder={t('mobileWithCode')}
                  autoComplete="tel"
                  maxLength={16}
                  pattern="\+?[1-9][0-9]{9,14}"
                  title={t('mobileWithCode')}
                  required
                  style={styles.input}
                />
              </>
            )}

            {authMode === 'login' && (
              <>
                <label style={styles.label} htmlFor="identifier">
                  {t('usernameOrEmail')}
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  value={form.identifier}
                  onChange={updateForm}
                  placeholder={t('enterUsernameEmail')}
                  autoComplete="username"
                  required
                  style={styles.input}
                />
              </>
            )}

            <label style={styles.label} htmlFor="password">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={updateForm}
              placeholder={t('enterPassword')}
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
                  {t('forgot')}
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
                ? t('pleaseWait')
                : authMode === 'login'
                  ? `${t('login')} →`
                  : t('createAccountButton')}
            </button>
          </form>

          <p style={styles.switchText}>
            {authMode === 'login'
              ? t('noAccount')
              : t('alreadyRegistered')}
            <button
              type="button"
              style={styles.switchButton}
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setError('')
              }}
            >
              {authMode === 'login' ? t('register') : t('login')}
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
            ⌂ {t('home')}
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
            ▤ {t('explore')}
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
            ♧ {t('notifications')}
          </button>

          <button
            type="button"
            className={activeView === 'profile' ? 'active' : ''}
            style={styles.navButton}
            onClick={openProfile}
          >
            ♙ {t('profile')}
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
            ◈ {t('plans')}
          </button>

          <button
            type="button"
            className={activeView === 'settings' ? 'active' : ''}
            style={styles.navButton}
            onClick={openSettings}
          >
            ⚙ {t('settings')}
          </button>
        </nav>

        <p className="sidebar-footer">{t('tagline')}</p>
      </aside>

      <main className="feed" id="home">
        <header style={styles.topbar}>
          <div style={styles.topbarTitle}>
            <h2>
              {activeView === 'profile'
                ? t('yourProfile')
                : activeView === 'settings'
                  ? t('settings')
                  : activeView === 'plans'
                    ? t('plans')
                    : t('homeFeed')}
            </h2>
            <p>
              {activeView === 'profile'
                ? t('profileSubtitle')
                : activeView === 'settings'
                  ? t('settingsSubtitle')
                  : activeView === 'plans'
                    ? t('plansSubtitle')
                    : t('homeSubtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={styles.logoutButton}
            aria-label={t('logout')}
          >
            {t('logout')}
          </button>

          <button
            type="button"
            aria-label={t('profile')}
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
              <h3>{t('accountDetails')}</h3>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('fullName')}</span>
                <strong>{user.name || t('notAvailable')}</strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('username')}</span>
                <strong>@{user.username || t('notAvailable')}</strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('email')}</span>
                <strong style={styles.breakText}>
                  {user.email || t('notAvailable')}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('mobile')}</span>
                <strong style={styles.breakText}>
                  {user.phone || t('mobileNotAdded')}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('mobileVerification')}</span>
                <strong
                  style={{
                    color: user.phoneVerified ? '#16a34a' : '#dc2626',
                    fontWeight: '600',
                  }}
                >
                  {user.phoneVerified ? t('verified') : t('notVerified')}
                </strong>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>{t('subscription')}</span>
                <strong style={styles.subscriptionBadge}>
                  {user.subscription || t('freePlan')}
                </strong>
              </div>

              {user.createdAt && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>{t('memberSince')}</span>
                  <strong>{formatDate(user.createdAt)}</strong>
                </div>
              )}

              <button
                type="button"
                style={{ ...styles.refreshButton, marginTop: 16 }}
                onClick={openSettings}
              >
                {t('changeEmail')}
              </button>
            </div>

            <div style={styles.detailsCard}>
              <div style={styles.historyHeader}>
                <div>
                  <h3 style={{ marginBottom: 5 }}>{t('loginHistory')}</h3>
                  <p style={styles.muted}>
                    {t('recentLogins')}
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
                  {profileLoading ? t('refreshing') : t('refresh')}
                </button>
              </div>

              {profileLoading ? (
                <p style={styles.emptyState}>
                  {t('loadingHistory')}
                </p>
              ) : loginHistory.length === 0 ? (
                <p style={styles.emptyState}>
                  {t('noLoginRecords')}
                </p>
              ) : (
                <div style={styles.historyList}>
                  {loginHistory.map((entry) => (
                    <article
                      key={entry._id || String(entry.loggedInAt) + '-' + String(entry.browser)}
                      style={styles.historyItem}
                    >
                      <div style={styles.historyIcon}>↗</div>
                      <div style={styles.historyInfo}>
                        <strong>{entry.browser || t('unknownBrowser')}</strong>
                        <p style={styles.historyMeta}>
                          {entry.operatingSystem || t('unknownOs')}
                          {' · '}
                          {entry.deviceCategory || t('unknownDevice')}
                        </p>
                        <p style={styles.historyMeta}>
                          {t('ipAddress')} {entry.ipAddress || t('unknown')}
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
              <h3 style={{ marginTop: 0 }}>{t('choosePlan')}</h3>
              <p style={styles.muted}>
                {t('planValidity')}
              </p>

              {paymentNotice && (
                <div
                  role="status"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid ' + (
                      paymentNotice.type === 'success'
                        ? '#86efac'
                        : paymentNotice.type === 'error'
                          ? '#fca5a5'
                          : '#fcd34d'
                    ),
                    background:
                      paymentNotice.type === 'success'
                        ? '#f0fdf4'
                        : paymentNotice.type === 'error'
                          ? '#fef2f2'
                          : '#fffbeb',
                    color:
                      paymentNotice.type === 'success'
                        ? '#166534'
                        : paymentNotice.type === 'error'
                          ? '#991b1b'
                          : '#92400e',
                  }}
                >
                  {paymentNotice.type === 'success'
                    ? t('paymentSuccessNotice')
                    : paymentNotice.type === 'error'
                      ? t('paymentFailedNotice')
                      : t('paymentPendingNotice')}
                </div>
              )}

              <div
                style={{
                  border: '1px solid #e7eaf1',
                  borderRadius: 12,
                  padding: 18,
                  marginTop: 20,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 18 }}>{t('freePlan')}</h4>

                  {(user?.subscription || 'Free') === 'Free' && (
                    <span
                      style={{
                        color: '#5546e8',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {t('currentPlan')}
                    </span>
                  )}
                </div>

                <strong style={{ display: 'block', fontSize: 27, marginTop: 12 }}>
                  ₹0
                </strong>

                <strong>{t('freeQuota')}</strong>

                <p style={{ ...styles.muted, marginBottom: 0 }}>
                  {t('freePlanDescription')}
                </p>
              </div>

              <PaymentCheckout
                token={token}
                apiBase={API_BASE}
                currentPlan={user?.subscription || 'Free'}
                subscriptionExpiresAt={user?.subscriptionExpiresAt}
                language={language}
              />

              <p
                style={{
                  ...styles.muted,
                  marginTop: 18,
                  fontSize: 12,
                }}
              >
                {t('paidTerms')}
              </p>

              {/* Payment History */}
              <div style={{ marginTop: 30 }}>
                <div style={styles.historyHeader}>
                  <div>
                    <h3 style={{ marginBottom: 5 }}>{t('paymentHistory')}</h3>
                    <p style={styles.muted}>
                      {t('recentPayments')}
                    </p>
                  </div>

                  <button
                    type="button"
                    style={styles.refreshButton}
                    disabled={paymentsLoading}
                    onClick={fetchPaymentHistory}
                  >
                    {paymentsLoading ? t('loading') : t('refresh')}
                  </button>
                </div>

                {paymentsLoading ? (
                  <p style={styles.emptyState}>{t('loadingPayments')}</p>
                ) : paymentsError ? (
                  <p role="alert" style={styles.error}>
                    {paymentsError}
                  </p>
                ) : payments.length === 0 ? (
                  <p style={styles.emptyState}>{t('noPayments')}</p>
                ) : (
                  <div style={styles.historyList}>
                    {payments.map((payment) => {
                      const statusColor =
                        payment.status === 'Success'
                          ? '#15803d'
                          : payment.status === 'Failed'
                            ? '#dc2626'
                            : '#b45309'

                      const statusBackground =
                        payment.status === 'Success'
                          ? '#dcfce7'
                          : payment.status === 'Failed'
                            ? '#fee2e2'
                            : '#fef3c7'

                      return (
                        <article
                          key={payment._id || payment.txnid}
                          style={styles.historyItem}
                        >
                          <div style={styles.historyIcon}>₹</div>

                          <div style={styles.historyInfo}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                              }}
                            >
                              <strong>{payment.plan} {t('planSuffix')}</strong>
                              <span
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 20,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: statusColor,
                                  background: statusBackground,
                                }}
                              >
                                {translatePaymentStatus(payment.status)}
                              </span>
                            </div>

                            <p style={styles.historyMeta}>
                              {t('amount')} ₹{payment.amount}
                            </p>
                            <p style={styles.historyMeta}>
                              {t('transactionId')} {payment.txnid}
                            </p>
                            <p style={styles.historyDate}>
                              {formatDate(payment.paidAt || payment.createdAt)}
                            </p>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : activeView === 'settings' ? (
          <section style={styles.profileSection}>
            <div style={styles.detailsCard}>
              <h3>{t('changePasswordTitle')}</h3>
              <p style={styles.muted}>{t('changePasswordDescription')}</p>
              <form onSubmit={handleChangePassword} style={styles.authForm}>
                <label style={styles.label} htmlFor="settings-current-password">{t('currentPasswordLabel')}</label>
                <input id="settings-current-password" type="password" value={currentPassword}
                  onChange={(event) => { setCurrentPassword(event.target.value); setPasswordChangeError(''); setPasswordChangeMessage('') }}
                  autoComplete="current-password" required style={styles.input} />
                <label style={styles.label} htmlFor="settings-new-password">{t('newPasswordLabel')}</label>
                <input id="settings-new-password" type="password" value={newPassword}
                  onChange={(event) => { setNewPassword(event.target.value); setPasswordChangeError(''); setPasswordChangeMessage('') }}
                  autoComplete="new-password" minLength={8} maxLength={72} required style={styles.input} />
                <label style={styles.label} htmlFor="settings-confirm-password">{t('confirmNewPasswordLabel')}</label>
                <input id="settings-confirm-password" type="password" value={confirmPassword}
                  onChange={(event) => { setConfirmPassword(event.target.value); setPasswordChangeError(''); setPasswordChangeMessage('') }}
                  autoComplete="new-password" minLength={8} maxLength={72} required style={styles.input} />
                {passwordChangeError && <p role="alert" style={styles.error}>{passwordChangeError}</p>}
                {passwordChangeMessage && <p role="status" style={styles.successMessage}>{passwordChangeMessage}</p>}
                <button type="submit" disabled={passwordChangeLoading} style={{ ...styles.submitButton, opacity: passwordChangeLoading ? 0.7 : 1 }}>
                  {passwordChangeLoading ? t('changingPassword') : t('updatePassword')}
                </button>
              </form>
            </div>

            <div style={styles.detailsCard}>
              <h3>{t('accountSettings')}</h3>
              <p style={styles.muted}>
                {t('accountSettingsText')}
              </p>

              <div style={{ marginTop: 20, marginBottom: 20 }}>
                <span style={styles.detailLabel}>
                  {t('currentEmail')}
                </span>
                <p style={{ ...styles.breakText, fontWeight: 600 }}>
                  {user.email || t('notAvailable')}
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
                      {t('newEmail')}
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
                      placeholder={t('enterNewEmail')}
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
                        ? t('sendingOtp')
                        : t('sendOtp')}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={styles.muted}>
                      {t('enterOtpSent')}
                    </p>
                    <strong style={styles.breakText}>{newEmail}</strong>

                    <label style={styles.label} htmlFor="email-change-otp">
                      {t('verificationCode')}
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
                      placeholder={t('enterOtp')}
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
                        ? t('verifying')
                        : t('verifyUpdateEmail')}
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
                      {t('differentEmail')}
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
                {t('backProfile')}
              </button>
            </div>

         

            {/* Browser notification preferences */}
            <div style={styles.detailsCard}>
              <h3>{t('browserNotifications')}</h3>
              <p style={styles.muted}>
                {t('browserNotificationsText')}
              </p>

              <p style={{ marginTop: 16 }}>
                {t('status')}{' '}
                <strong>
                  {notificationsEnabled ? t('enabled') : t('disabled')}
                </strong>
              </p>

              {!notificationsEnabled ? (
                <button
                  type="button"
                  style={styles.submitButton}
                  onClick={enableNotifications}
                >
                  {t('enableNotifications')}
                </button>
              ) : (
                <button
                  type="button"
                  style={styles.refreshButton}
                  onClick={disableNotifications}
                >
                  {t('disableNotifications')}
                </button>
              )}

              {typeof Notification !== 'undefined' &&
                Notification.permission === 'denied' && (
                  <p style={styles.error}>
                    {t('notificationsBlocked')}
                  </p>
                )}
                </div>

            <LanguageSettings
              token={token}
              apiBase={API_BASE}
              onLanguageChange={handleLanguageChange}
            />

</section>
            
        ) : (
          <>
            <div style={styles.welcome}>
              {t('loggedInAs')} <strong>{user.name}</strong> (@{user.username})
            </div>

            <AudioTweets
  token={token}
  apiBase={API_BASE}
  language={language}
/>

            <form className="composer" onSubmit={createPost}>
              <div className="avatar">{initial}</div>
              <div className="composer-body">
                <textarea
                  value={post}
                  onChange={(event) => setPost(event.target.value)}
                  placeholder={t('whatsHappening')}
                  maxLength={280}
                  aria-label={t('writePost')}
                />
                <div className="composer-bottom">
                  <span>{post.length}/280</span>
                  <button
                    type="submit"
                    disabled={!post.trim() || submitting}
                  >
                    {submitting ? t('posting') : t('post')}
                  </button>
                </div>
              </div>
            </form>

            <div className="feed-heading" id="feed">
              <h3>{t('latestPosts')}</h3>
              <span>{t('forYou')}</span>
            </div>

            {loading ? (
              <p style={{ padding: 24 }}>{t('loadingPosts')}</p>
            ) : posts.length === 0 ? (
              <p style={{ padding: 24 }}>
                {t('noPosts')}
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
                      <span>♡ {item.likes} {t('likes')}</span>
                      <span>◯ {t('reply')}</span>
                      <span>↗ {t('share')}</span>
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
          <h3>{t('about')}</h3>
          <p>{t('aboutText')}</p>
        </section>

        <section className="info-card">
          <h3>
            {activeView === 'profile' ? t('accountSecurity') : t('whatsNext')}
          </h3>
          <p>
            {activeView === 'profile'
              ? t('securityText')
              : t('whatsNextText')}
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


import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:5000/api'
const POSTS_URL = `${API_BASE}/posts`
const TOKEN_KEY = 'pulseconnect_token'

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
  const [authMode, setAuthMode] = useState('login')
  const [authLoading, setAuthLoading] = useState(false)

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

  async function loginUser(identifier, password) {
    const data = await requestJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })

    if (!data.token) {
      throw new Error('Login succeeded, but no token was received')
    }

    sessionStorage.setItem(TOKEN_KEY, data.token)
    setToken(data.token)
    setUser(data.user)
    setError('')
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

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
    setPosts([])
    setPost('')
    setError('')
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
      setPosts(data.posts)
    } catch (err) {
      setError(err.message || 'Could not load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }

    let cancelled = false

    async function verifySession() {
      try {
        const data = await requestJSON(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!cancelled) {
          setUser(data.user)
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(TOKEN_KEY)
          setToken('')
          setUser(null)
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
    if (user) {
      fetchPosts()
    }
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
        body: JSON.stringify({
          content: post.trim(),
        }),
      })

      setPosts((currentPosts) => [data.post, ...currentPosts])
      setPost('')
    } catch (err) {
      setError(err.message || 'Could not create post')
    } finally {
      setSubmitting(false)
    }
  }

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
              style={
                authMode === 'login'
                  ? styles.activeMode
                  : styles.mode
              }
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
                authMode === 'register'
                  ? styles.activeMode
                  : styles.mode
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

                <label style={styles.label} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
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
                authMode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              required
              style={styles.input}
            />

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
                setAuthMode(
                  authMode === 'login' ? 'register' : 'login'
                )
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
          <a className="active" href="#home">⌂ Home</a>
          <a href="#feed">▤ Explore</a>
          <a href="#notifications">♧ Notifications</a>
          <a href="#profile">♙ Profile</a>
          <a href="#settings">⚙ Settings</a>
        </nav>

        <p className="sidebar-footer">Connect. Share. Belong.</p>
      </aside>

      <main className="feed" id="home">
        <header className="topbar">
          <div>
            <h2>Home Feed</h2>
            <p>Your world, in real time.</p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={styles.logoutButton}
          >
            Log out
          </button>

          <div className="avatar">{initial}</div>
        </header>

        <div style={styles.welcome}>
          Logged in as <strong>{user.name}</strong> (@{user.username})
        </div>

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

        {error && (
          <p role="alert" style={{ color: '#c62828', padding: '0 24px' }}>
            {error}
          </p>
        )}

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
                  <span>{item.username}</span>
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
      </main>

      <aside className="rightbar">
        <section className="info-card">
          <h3>About PulseConnect</h3>
          <p>
            A place for conversations, communities, and new ideas.
          </p>
        </section>

        <section className="info-card">
          <h3>What's next?</h3>
          <p>
            Profiles, subscriptions, audio posts, notifications, and more.
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
  authLogo: {
    marginTop: 0,
    marginBottom: 28,
    fontSize: 28,
  },
  muted: {
    color: '#687386',
    lineHeight: 1.5,
    marginTop: 0,
  },
  modeButtons: {
    display: 'flex',
    gap: 8,
    margin: '24px 0',
  },
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
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    marginTop: 5,
  },
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
  logoutButton: {
    padding: '8px 12px',
    border: '1px solid #dce1eb',
    borderRadius: 8,
    background: '#ffffff',
    cursor: 'pointer',
  },
  welcome: {
    padding: '12px 24px',
    fontSize: 14,
    color: '#687386',
  },
}

export default App

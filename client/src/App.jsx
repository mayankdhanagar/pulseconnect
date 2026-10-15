import { useState } from 'react'
import './App.css'

function App() {
  const [post, setPost] = useState('')
  const [posts, setPosts] = useState([
    {
      id: 1,
      name: 'PulseConnect',
      username: '@pulseconnect',
      text: 'Welcome to PulseConnect! Your space to share ideas, connect with people, and explore what matters.',
      likes: 12,
    },
  ])

  function createPost() {
    if (!post.trim()) return

    setPosts([
      {
        id: Date.now(),
        name: 'Mayank',
        username: '@mayank',
        text: post,
        likes: 0,
      },
      ...posts,
    ])
    setPost('')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="logo">Pulse<span>Connect</span></h1>
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
          <div className="avatar">M</div>
        </header>

        <section className="composer">
          <div className="avatar">M</div>
          <div className="composer-body">
            <textarea
              value={post}
              onChange={(event) => setPost(event.target.value)}
              placeholder="What's happening?"
              maxLength={280}
            />
            <div className="composer-bottom">
              <span>{post.length}/280</span>
              <button onClick={createPost} disabled={!post.trim()}>
                Post →
              </button>
            </div>
          </div>
        </section>

        <div className="feed-heading" id="feed">
          <h3>Latest posts</h3>
          <span>For you</span>
        </div>

        {posts.map((item) => (
          <article className="post-card" key={item.id}>
            <div className="avatar">{item.name.charAt(0)}</div>
            <div className="post-content">
              <div className="post-author">
                <strong>{item.name}</strong>
                <span>{item.username}</span>
              </div>
              <p>{item.text}</p>
              <div className="post-actions">
                <span>♡ {item.likes} Likes</span>
                <span>◯ Reply</span>
                <span>↗ Share</span>
              </div>
            </div>
          </article>
        ))}
      </main>

      <aside className="rightbar">
        <section className="info-card">
          <h3>About PulseConnect</h3>
          <p>A place for conversations, communities, and new ideas.</p>
        </section>

        <section className="info-card">
          <h3>What's next?</h3>
          <p>Profiles, subscriptions, audio posts, notifications, and more.</p>
        </section>

        <p className="copyright">© 2026 PulseConnect</p>
      </aside>
    </div>
  )
}

export default App
import { useNavigate } from 'react-router-dom'
import { useRooms } from '../../hooks/useRooms'
import { PROBLEMS } from '../../data/dummy'
import type { Difficulty } from '../../types'
import './Landing.css'

const FEATURES = [
  { icon: '⏱', title: 'Timed rooms', desc: 'Configurable 30–60 min sessions that mirror real interview pressure.' },
  { icon: '👁', title: 'Blurred peer previews', desc: "See that others are progressing without copying. Keeps you honest." },
  { icon: '🗺', title: 'Shared whiteboard', desc: 'Draw boxes, arrows, and annotations in real time. Export when done.' },
  { icon: '💬', title: 'Lobby chat', desc: 'Slack-style channels for every topic — databases, caching, and more.' },
  { icon: '📊', title: 'Progress tracking', desc: "See which problems you've solved, your completion rate, and streaks." },
  { icon: '🏆', title: 'Leaderboard', desc: 'Friendly competition via weekly rankings filtered by topic or difficulty.' },
]

const TESTIMONIALS = [
  { quote: "The blurred progress view was a game-changer. I stopped second-guessing myself and just designed. Got the Stripe offer two weeks later.", name: 'Arjun K.', role: 'SWE @ Stripe', initials: 'AK', color: '#7c5cbf' },
  { quote: "Way better than grinding alone. The timed pressure + seeing someone else working keeps you from going down rabbit holes for 40 mins.", name: 'Maya H.', role: 'Staff Eng @ LinkedIn', initials: 'MH', color: '#0ea5e9' },
  { quote: "The lobby discussions after sessions are where I learned the most. People share wildly different tradeoffs for the same problem.", name: 'Ricardo L.', role: 'SWE @ Shopify', initials: 'RL', color: '#ec4899' },
]

function DiffBadge({ d }: { d: Difficulty }) {
  return <span className={`diff diff-${d}`}>{d}</span>
}

export default function Landing() {
  const navigate = useNavigate()
  const { rooms, activeCount } = useRooms(['active', 'waiting'])

  const liveRooms = rooms.filter(r => r.status === 'active').slice(0, 3)

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">oct<span>ree</span>.io</div>
        <ul className="nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#problems">Problems</a></li>
          <li><a href="#features">Features</a></li>
        </ul>
        <div className="nav-actions">
          <button className="btn-ghost" onClick={() => navigate('/lobby')}>Log in</button>
          <button className="btn-primary" onClick={() => navigate('/lobby')}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-badge">
          <span className="badge-dot" />
          {activeCount} rooms active right now
        </div>
        <h1>Master system design with <em>real peers</em>, in real time</h1>
        <p className="hero-sub">
          Join timed practice rooms, tackle distributed systems problems side-by-side,
          and get better — fast.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate('/lobby')}>Start a practice room</button>
          <button className="hero-btn-outline" onClick={() => navigate('/lobby')}>Browse problems</button>
        </div>
        <div className="hero-meta">
          <span><strong>50+</strong> curated problems</span>
          <span><strong>No signup</strong> to spectate</span>
          <span><strong>Free</strong> to start</span>
        </div>

        {/* PREVIEW WINDOW */}
        <div className="preview-window">
          <div className="window-bar">
            <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
            <span className="window-title">octree.io — Lobby</span>
          </div>
          <div className="preview-cards">
            {liveRooms.map(room => (
              <div key={room.id} className="preview-card">
                <div className="preview-card-header">
                  <span className="tag-live">Live</span>
                  <span className="preview-timer">⏱ {room.durationMinutes}m room</span>
                </div>
                <div className="preview-title">{room.problem.title}</div>
                <div className="preview-avatars">
                  {room.participants.slice(0, 3).map(p => (
                    <div key={p.user.id} className="preview-avatar" style={{ background: p.user.color }}>
                      {p.user.username.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="preview-bar-bg">
                  <div className="preview-bar" style={{ width: `${room.participants[0]?.progress ?? 0}%` }} />
                </div>
              </div>
            ))}
            {/* waiting room slot */}
            <div className="preview-card">
              <div className="preview-card-header">
                <span className="tag-open">Open</span>
                <span className="preview-timer">0/4 players</span>
              </div>
              <div className="preview-title">Join a room →</div>
              <div className="preview-avatars" />
              <div className="preview-bar-bg"><div className="preview-bar" style={{ width: '0%' }} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="section-label">Process</div>
        <h2>How octree.io works</h2>
        <p className="section-sub">Four steps from zero to interview-ready.</p>
        <div className="steps">
          {[
            { n: '1', title: 'Pick a problem', desc: 'Choose from 50+ curated questions ranked by difficulty and topic.' },
            { n: '2', title: 'Create or join a room', desc: 'Go solo or invite peers. Public rooms match you with other engineers instantly.' },
            { n: '3', title: 'Design under the clock', desc: "A shared whiteboard and your peers' blurred progress keeping you honest." },
            { n: '4', title: 'Review & compare', desc: "When time's up, compare approaches and discuss tradeoffs in the lobby." },
          ].map(s => (
            <div key={s.n} className="step">
              <div className="step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="section section-alt" id="features">
        <div className="section-label">Features</div>
        <h2>Everything you need to level up</h2>
        <p className="section-sub">Built by engineers who've been through hundreds of system design interviews.</p>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feat-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEMS */}
      <section className="section" id="problems">
        <div className="section-label">Problems</div>
        <h2>A few of our favorites</h2>
        <p className="section-sub">From classic FAANG staples to niche distributed systems puzzles.</p>
        <div className="problems-grid">
          {PROBLEMS.map(p => (
            <div key={p.id} className="problem-pill">
              <span className="problem-pill-name">{p.title}</span>
              <DiffBadge d={p.difficulty} />
            </div>
          ))}
          {/* extra fillers */}
          {[
            { title: 'Search Autocomplete', d: 'medium' as Difficulty },
            { title: 'Notification System', d: 'medium' as Difficulty },
            { title: 'Web Crawler', d: 'medium' as Difficulty },
            { title: 'File Storage (S3)', d: 'hard' as Difficulty },
            { title: 'Pastebin', d: 'easy' as Difficulty },
            { title: 'Ride-sharing App', d: 'hard' as Difficulty },
          ].map(p => (
            <div key={p.title} className="problem-pill">
              <span className="problem-pill-name">{p.title}</span>
              <DiffBadge d={p.d} />
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section section-alt">
        <div className="section-label">Community</div>
        <h2>What engineers are saying</h2>
        <p className="section-sub">Straight from the people who landed the offer.</p>
        <div className="testimonials">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="testimonial">
              <p className="testi-quote">{t.quote}</p>
              <div className="testi-author">
                <div className="avatar" style={{ width: 36, height: 36, borderRadius: 9, background: t.color, fontSize: '0.75rem' }}>
                  {t.initials}
                </div>
                <div>
                  <div className="author-name">{t.name}</div>
                  <div className="author-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section">
        <div className="cta-box">
          <div className="cta-glow" />
          <h2>Ready to practice?</h2>
          <p>Join thousands of engineers already leveling up their system design game. Free to start, no credit card needed.</p>
          <button className="btn-primary" onClick={() => navigate('/lobby')}>Create your first room →</button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">oct<span>ree</span>.io</div>
        <ul className="footer-links">
          <li><a href="#problems">Problems</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Privacy</a></li>
        </ul>
        <span className="footer-copy">© 2026 octree.io</span>
      </footer>
    </div>
  )
}

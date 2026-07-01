import './Landing.css'
import { Link } from 'react-router-dom'
import { BrandLink } from './components/Logo'

function Avatar({ initials, color, size = 30 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

/* ---------- product mock shown in the hero ---------- */

function RoomMock() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-topbar">
        <div className="mock-dots"><span /><span /><span /></div>
        <div className="mock-room-name">room · two-pointer-tuesday</div>
        <div className="mock-timer">18:24</div>
      </div>

      <div className="mock-body">
        <aside className="mock-side">
          <div className="mock-label">problem</div>
          <div className="mock-problem-title">Koko Eating Bananas</div>
          <span className="chip chip-medium">Medium</span>
          <p className="mock-problem-text">
            Return the minimum integer <code>k</code> such that Koko can eat all
            bananas within <code>h</code> hours.
          </p>

          <div className="mock-label mock-label-mt">in the room · 4</div>
          <ul className="mock-people">
            <li><Avatar initials="AV" color="#7c5cbf" size={26} /> <span>ava</span><span className="dot-live" /></li>
            <li><Avatar initials="JN" color="#2f7d5b" size={26} /> <span>jonas</span><span className="dot-live" /></li>
            <li><Avatar initials="MK" color="#b45f9d" size={26} /> <span>mikael</span><span className="dot-typing">typing…</span></li>
            <li><Avatar initials="RØ" color="#3b6fb0" size={26} /> <span>you</span><span className="dot-live" /></li>
          </ul>
        </aside>

        <div className="mock-editor">
          <div className="mock-editor-tabs">
            <span className="mock-tab mock-tab-active">solution.py</span>
            <span className="mock-lang">Python 3</span>
          </div>
          <pre className="mock-code">
<span className="l"><span className="kw">class</span> <span className="ty">Solution</span>:</span>
<span className="l">  <span className="kw">def</span> <span className="fn">minEatingSpeed</span>(self, piles, h):</span>
<span className="l">    lo, hi = <span className="nm">1</span>, <span className="bi">max</span>(piles)</span>
<span className="l">    <span className="kw">while</span> lo &lt; hi:</span>
<span className="l">      mid = (lo + hi) // <span className="nm">2</span></span>
<span className="l">      hrs = <span className="bi">sum</span>(-(-p // mid) <span className="kw">for</span> p <span className="kw">in</span> piles)</span>
<span className="l">      <span className="kw">if</span> hrs &lt;= h: hi = mid</span>
<span className="l">      <span className="kw">else</span>: lo = mid + <span className="nm">1</span></span>
<span className="l cur">    <span className="kw">return</span> lo<span className="caret" /></span>
          </pre>
          <div className="mock-results">
            <span className="pass">✓ 27 / 27 tests passed</span>
            <span className="mock-runtime">14 ms · beats 91%</span>
          </div>
        </div>
      </div>

      <div className="mock-chat">
        <span className="chat-msg"><b>jonas</b> binary search on the answer 🔥</span>
        <span className="chat-msg"><b>ava</b> yeah, ceil-div was the trick</span>
      </div>
    </div>
  )
}

/* ---------- sections ---------- */

const features = [
  {
    title: 'Live practice rooms',
    body: 'Jump into a room and work the same problem alongside others in real time. See who’s online, who’s still thinking, and who just hit submit.',
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M13 15c1-.6 2-1 3-1 2.8 0 5 2.2 5 5" /></svg>
    ),
  },
  {
    title: 'Run against real tests',
    body: 'Write in Python, Java, C++, or JavaScript and run your solution against the full test suite. Get pass/fail, runtime, and the first failing case instantly.',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16" /></svg>
    ),
  },
  {
    title: 'Chat while you solve',
    body: 'Drop hints, compare approaches, and rubber-duck out loud. A room is a conversation, not a silent leaderboard.',
    icon: (
      <svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5z" /></svg>
    ),
  },
  {
    title: 'Share when the round ends',
    body: 'When the timer runs out, every solution unlocks. Read how others solved it, compare complexity, and steal the patterns that stuck.',
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></svg>
    ),
  },
]

const steps = [
  { n: '0001', title: 'Find a room', body: 'Browse the lobby by difficulty and topic, or spin up your own and invite friends.' },
  { n: '0010', title: 'Solve together', body: 'The timer starts. Everyone gets the same prompt. Code, test, and talk it through.' },
  { n: '0011', title: 'Compare & learn', body: 'Solutions unlock at the buzzer. See every approach side by side and level up.' },
]

export default function Landing() {
  return (
    <div className="landing">
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />

      {/* NAV */}
      <header className="nav">
        <BrandLink to="/" size={26} />
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#lobby">Lobby</a>
        </nav>
        <div className="nav-actions">
          <Link className="link-muted" to="/login">Sign in</Link>
          <Link className="btn-primary nav-cta" to="/signup">Get started</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> Interview prep, together</span>
          <h1>
            Practice interviews<br />
            in a room, <span className="grad">not alone.</span>
          </h1>
          <p className="hero-sub">
            octree.io drops you into live rooms where you solve real interview
            problems next to other people — run your code against tests, chat as
            you go, and share every solution the moment the round ends.
          </p>
          <div className="hero-cta">
            <Link className="btn-primary btn-lg" to="/signup">Start practicing free</Link>
            <a className="btn-ghost btn-lg" href="#lobby">Browse the lobby →</a>
          </div>
          <div className="hero-trust">
            <div className="trust-avatars">
              <Avatar initials="AV" color="#7c5cbf" size={28} />
              <Avatar initials="JN" color="#2f7d5b" size={28} />
              <Avatar initials="MK" color="#b45f9d" size={28} />
              <Avatar initials="RØ" color="#3b6fb0" size={28} />
            </div>
            <span>Join thousands practicing live every week.</span>
          </div>
        </div>
        <div className="hero-visual">
          <RoomMock />
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="section-head">
          <span className="kicker">Why octree</span>
          <h2>Everything a mock interview should be.</h2>
          <p>Rooms, real execution, real people — none of the loneliness of grinding alone.</p>
        </div>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="section-head">
          <span className="kicker">How it works</span>
          <h2>From lobby to lightbulb in three steps.</h2>
        </div>
        <div className="steps">
          {steps.map((s) => (
            <div className="step" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band" id="lobby">
        <div className="cta-inner">
          <h2>A room is open right now.</h2>
          <p>Grab a problem, meet a few people, and turn prep into something you actually look forward to.</p>
          <div className="hero-cta">
            <Link className="btn-primary btn-lg" to="/signup">Enter a room</Link>
            <Link className="btn-ghost btn-lg" to="/lobby">See what’s live →</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <BrandLink to="/" />
          <p>Practice technical interviews with other humans.</p>
        </div>
        <div className="footer-cols">
          <div>
            <span className="footer-h">Product</span>
            <a href="#features">Features</a>
            <a href="#lobby">Lobby</a>
            <Link to="/signup">Get started</Link>
          </div>
          <div>
            <span className="footer-h">Company</span>
            <a href="/about">About</a>
            <a href="/blog">Blog</a>
            <a href="/contact">Contact</a>
          </div>
          <div>
            <span className="footer-h">Legal</span>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} octree.io — built for people who’d rather not prep alone.</div>
      </footer>
    </div>
  )
}

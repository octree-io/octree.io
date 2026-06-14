import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRoom } from '../../hooks/useRoom'
import { useTimer } from '../../hooks/useTimer'
import { useChat } from '../../hooks/useChat'
import { useUser } from '../../contexts/UserContext'
import type { Participant } from '../../types'
import './GameRoom.css'

type PanelTab = 'problem' | 'peers' | 'notes'

export default function GameRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { room, peers, myParticipant, isHost, start, finish, submit } = useRoom(roomId ?? '')
  const { formatted, remaining, pct } = useTimer(room?.startedAt, room?.durationMinutes ?? 45)
  const { messages, draft, setDraft, send } = useChat(roomId ?? '')
  const [tab, setTab] = useState<PanelTab>('problem')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight })
  }, [messages])

  if (!room) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100svh', color: 'var(--muted)' }}>
        Room not found. <button style={{ marginLeft: 8, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/lobby')}>Back to lobby</button>
      </div>
    )
  }

  const timerColor = remaining < 300 ? 'var(--red)' : remaining < 600 ? 'var(--yellow)' : 'var(--purple)'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="game-room">
      {/* TOP BAR */}
      <div className="gr-topbar">
        <div className="gr-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/lobby')}>
          oct<span>ree</span>.io
        </div>
        <span className="gr-sep" />
        <span className="room-label">Room #{room.id.slice(-4).toUpperCase()}</span>
        <div className="problem-chip">
          <strong>{room.problem.title}</strong> · {room.problem.difficulty}
        </div>
        <div className="topbar-spacer" />

        <div className="timer-display">
          <div>
            <div className="timer-time" style={{ color: timerColor }}>{formatted}</div>
            <div className="timer-label">remaining</div>
          </div>
          <div className="timer-avatars">
            {room.participants.map(p => (
              <div key={p.user.id} className="timer-avatar" style={{ background: p.user.color }}>
                {p.user.username.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        <span className="gr-sep" />
        <div className="gr-actions">
          {room.status === 'waiting' && isHost && (
            <button className="btn-sm btn-sm-primary" onClick={start}>▶ Start</button>
          )}
          {room.status === 'active' && !myParticipant?.submittedAt && (
            <button className="btn-sm btn-sm-primary" onClick={submit}>Submit ↗</button>
          )}
          {myParticipant?.submittedAt && (
            <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>✓ Submitted</span>
          )}
          {room.status === 'active' && isHost && (
            <button className="btn-sm btn-sm-ghost" onClick={finish}>Finish Room</button>
          )}
          <button className="btn-sm btn-sm-danger" onClick={() => navigate('/lobby')}>Leave</button>
        </div>
      </div>

      <div className="gr-main">
        {/* LEFT PANEL */}
        <div className="gr-left">
          <div className="panel-tabs">
            {(['problem', 'peers', 'notes'] as PanelTab[]).map(t => (
              <button key={t} className={`panel-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'peers' ? `Peers (${peers.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="panel-body">
            {tab === 'problem' && <ProblemTab room={room} />}
            {tab === 'peers' && <PeersTab peers={peers} myParticipant={myParticipant} user={user} pct={pct} />}
            {tab === 'notes' && (
              <div>
                <textarea style={{ width: '100%', height: 300, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, color: 'var(--text)', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} placeholder="Jot down your notes…" />
              </div>
            )}
          </div>
        </div>

        {/* WHITEBOARD */}
        <div className="gr-center">
          <div className="wb-toolbar">
            {['⬡', '✏️', '▭', '↗', 'T'].map((icon, i) => (
              <button key={icon} className={`tool-btn ${i === 0 ? 'active' : ''}`}>{icon}</button>
            ))}
            <span className="tool-sep" />
            {['#a78bfa', '#e2e2f0', '#22c55e', '#fbbf24', '#ef4444'].map((c, i) => (
              <div key={c} className={`color-swatch ${i === 0 ? 'active' : ''}`} style={{ background: c }} />
            ))}
            <span className="tool-sep" />
            <button className="tool-btn">↩</button>
            <button className="tool-btn">↪</button>
            <span className="tool-sep" />
            <button className="tool-btn">−</button>
            <span className="zoom-label">100%</span>
            <button className="tool-btn">+</button>
            <span className="wb-spacer" />
            <span className="shape-info">3 components · 5 connections</span>
            <button className="tool-btn">⬇</button>
          </div>

          <div className="canvas-area">
            <div className="canvas-inner">
              <WhiteboardDiagram />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — room chat */}
        <div className="gr-right">
          <div className="gr-chat-header">
            <span className="gr-chat-dot" />
            Room Chat
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 400 }}>
              {room.participants.length} online
            </span>
          </div>

          <div className="gr-chat-feed" ref={feedRef}>
            <div className="gr-sys-msg">Room started</div>
            {messages.map(msg => (
              <div key={msg.id} className="gr-msg">
                <div className="gr-msg-meta">
                  <span className="gr-msg-name" style={{ color: msg.user.color }}>{msg.user.username}</span>
                  <span className="gr-msg-time">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="gr-msg-text">{msg.text}</div>
              </div>
            ))}
            {/* Seed room chat messages */}
            {messages.length === 0 && <RoomSeedMessages participants={room.participants} />}
          </div>

          <div className="gr-chat-input">
            <textarea
              className="gr-input"
              placeholder="Message the room…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="gr-chat-footer">
            <button className="btn-sm btn-sm-primary" style={{ fontSize: '0.75rem', padding: '4px 12px' }} onClick={send}>
              Send ↑
            </button>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div className="gr-statusbar">
        <div className="status-item">
          <span className="status-led led-green" />
          Connected
        </div>
        <span>Whiteboard synced</span>
        <span style={{ color: 'var(--purple)' }}>
          {room.status === 'active' ? 'Session active' : room.status === 'waiting' ? 'Waiting to start' : 'Session finished'}
        </span>
        <div className="statusbar-right">
          <span>Zoom 100%</span>
          <span>Canvas 1400×900</span>
          <span>Autosaved {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function ProblemTab({ room }: { room: NonNullable<ReturnType<typeof useRoom>['room']> }) {
  const p = room.problem
  return (
    <>
      <div className="prob-header">
        <div className="prob-title">{p.title}</div>
        <span className={`diff-badge ${p.difficulty}`}>{p.difficulty}</span>
      </div>
      <p className="prob-desc">{p.description}</p>

      <div className="prob-section">Functional Requirements</div>
      <ul className="req-list">{p.requirements.functional.map(r => <li key={r}>{r}</li>)}</ul>

      <div className="prob-section">Non-Functional Requirements</div>
      <ul className="req-list">{p.requirements.nonFunctional.map(r => <li key={r}>{r}</li>)}</ul>

      <div className="prob-section">Scale Assumptions</div>
      <div className="chips">{p.scaleAssumptions.map(s => <span key={s} className="chip">{s}</span>)}</div>

      <div className="prob-section">Hint Topics</div>
      <div className="chips">{p.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>
    </>
  )
}

function PeersTab({
  peers, myParticipant, user, pct
}: {
  peers: Participant[]
  myParticipant: Participant | undefined
  user: { username: string; color: string }
  pct: number
}) {
  const PEER_NODES = [['Client', 'LB', 'API GW'], ['Upload', 'CDN', 'Queue'], ['DB', 'Cache']]

  return (
    <div className="peer-list">
      {/* Your card */}
      <div className="you-card">
        <div className="you-label">You</div>
        <div className="peer-header">
          <div className="peer-avatar" style={{ background: user.color }}>
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <span className="peer-name">{user.username}</span>
          <span className="online-dot" />
        </div>
        <div className="peer-progress">
          <div className="progress-bg">
            <div className="progress-fill" style={{ width: `${myParticipant?.progress ?? Math.round(pct)}%` }} />
          </div>
          <span className="progress-pct">{myParticipant?.progress ?? Math.round(pct)}%</span>
        </div>
      </div>

      {/* Peer cards */}
      {peers.map((peer, i) => (
        <div key={peer.user.id} className="peer-card">
          <div className="peer-header">
            <div className="peer-avatar" style={{ background: peer.user.color }}>
              {peer.user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="peer-name">{peer.user.username}</div>
              <div className="peer-status">{peer.submittedAt ? '✓ Submitted' : 'Designing…'}</div>
            </div>
            <span className="online-dot" />
          </div>
          <div className="peer-preview">
            <div className="peer-preview-inner">
              {(PEER_NODES[i % PEER_NODES.length] ?? PEER_NODES[0]).map(label => (
                <div key={label} className="peer-preview-node">{label}</div>
              ))}
            </div>
            <div className="blur-overlay">
              <span className="blur-label">blurred</span>
            </div>
          </div>
          <div className="peer-progress">
            <div className="progress-bg">
              <div className="progress-fill" style={{ width: `${peer.progress}%` }} />
            </div>
            <span className="progress-pct">{peer.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RoomSeedMessages({ participants }: { participants: Participant[] }) {
  const seeded = [
    { text: 'Starting with requirements clarification. Is live streaming in scope?', pi: 0 },
    { text: 'Good call. I\'d say no live streaming to keep it reasonable. VOD only.', pi: 1 },
    { text: 'Anyone using Kafka for the transcoding pipeline?', pi: 2 },
    { text: 'Yeah Kafka — want the consumer group semantics for parallel workers.', pi: 0 },
  ]
  return (
    <>
      {seeded.map((s, i) => {
        const p = participants[s.pi % participants.length]
        if (!p) return null
        return (
          <div key={i} className="gr-msg">
            <div className="gr-msg-meta">
              <span className="gr-msg-name" style={{ color: p.user.color }}>{p.user.username}</span>
              <span className="gr-msg-time">{new Date(Date.now() - (seeded.length - i) * 3 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="gr-msg-text">{s.text}</div>
          </div>
        )
      })}
    </>
  )
}

function WhiteboardDiagram() {
  return (
    <>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(167,139,250,0.5)" />
          </marker>
        </defs>
        {CONNECTIONS.map((c, i) => (
          <line key={i} x1={c[0]} y1={c[1]} x2={c[2]} y2={c[3]}
            stroke={c[4] ?? 'rgba(167,139,250,0.35)'} strokeWidth="1.5"
            strokeDasharray={c[5] ?? undefined} markerEnd="url(#arrow)" />
        ))}
      </svg>

      {SECTION_LABELS.map(s => (
        <div key={s.label} className="canvas-section" style={{ left: s.x, top: s.y, width: s.w }}>{s.label}</div>
      ))}

      {NODES.map(n => (
        <div key={n.label} className={`node ${n.selected ? 'selected' : ''} ${n.highlighted ? 'highlighted' : ''}`} style={{ left: n.x, top: n.y }}>
          <span className="node-icon">{n.icon}</span>
          <span className="node-label">{n.label}</span>
          <span className="node-sub">{n.sub}</span>
        </div>
      ))}

      {ANNOTATIONS.map(a => (
        <div key={a.text} className="annotation" style={{ left: a.x, top: a.y }}>{a.text}</div>
      ))}

      <div className="sticky-note" style={{ left: 300, top: 380 }}>
        📝 TODO: Add Redis cache layer between Stream Svc and DB for view counts
      </div>
    </>
  )
}

/* ── Static diagram data ── */

const NODES = [
  { label: 'Client', sub: 'Web / Mobile', icon: '🖥', x: 80, y: 95, selected: false, highlighted: false },
  { label: 'Load Balancer', sub: 'L7 — nginx', icon: '⚖️', x: 310, y: 95, selected: false, highlighted: true },
  { label: 'API Gateway', sub: 'Auth + routing', icon: '🔀', x: 550, y: 95, selected: true, highlighted: false },
  { label: 'Upload Svc', sub: 'Chunked upload', icon: '📤', x: 730, y: 185, selected: false, highlighted: false },
  { label: 'Stream Svc', sub: 'HLS / DASH', icon: '▶️', x: 730, y: 295, selected: false, highlighted: false },
  { label: 'Search Svc', sub: 'Elasticsearch', icon: '🔍', x: 730, y: 450, selected: false, highlighted: false },
  { label: 'Object Store', sub: 'S3-compatible', icon: '🗄', x: 960, y: 190, selected: false, highlighted: false },
  { label: 'Message Queue', sub: 'Kafka', icon: '📨', x: 960, y: 310, selected: false, highlighted: false },
  { label: 'CDN', sub: 'Cloudflare', icon: '⚡', x: 960, y: 450, selected: false, highlighted: false },
  { label: 'Transcoder', sub: 'FFmpeg workers', icon: '🔧', x: 960, y: 590, selected: false, highlighted: false },
  { label: 'Metadata DB', sub: 'PostgreSQL', icon: '🗃', x: 730, y: 570, selected: false, highlighted: false },
]

const CONNECTIONS: [number, number, number, number, string?, string?][] = [
  [185, 120, 310, 120],
  [415, 120, 550, 120],
  [640, 105, 730, 200],
  [640, 130, 730, 310],
  [840, 215, 960, 215],
  [840, 225, 960, 335],
  [1060, 335, 1060, 590, 'rgba(167,139,250,0.35)'],
  [840, 330, 960, 465],
  [730, 465, 730, 570],
]

const SECTION_LABELS = [
  { label: 'Client Layer', x: 60, y: 60, w: 180 },
  { label: 'Ingress / Routing', x: 290, y: 60, w: 380 },
  { label: 'Service Layer', x: 700, y: 150, w: 400 },
]

const ANNOTATIONS = [
  { text: 'HTTPS', x: 230, y: 103 },
  { text: 'gRPC', x: 470, y: 103 },
  { text: 'PUT', x: 900, y: 198 },
  { text: 'publish', x: 880, y: 350 },
]

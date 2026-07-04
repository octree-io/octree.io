import { useState, useEffect, useRef } from 'react'
import { BrandLink } from '../../components/Logo'
import { SendIcon, XIcon, LockIcon } from '../../components/Icons'
import { useRoom, initials, LOBBY_PREFIX, type ChatMessage } from '../../lib/socket'
import './Chat.css'

/* ---------- types ---------- */

interface Room {
  id: string
  name: string
  topic: string
  members: number
  private: boolean
  listed: boolean
  joined: boolean
  code: string
}

/* ---------- seed rooms (the channel directory is still client-side) ---------- */

const INITIAL_ROOMS: Room[] = [
  { id: 'general', name: 'general',       topic: 'Company-wide hangout',                members: 214, private: false, listed: true,  joined: true,  code: 'GEN001' },
  { id: 'daily',   name: 'daily-problem', topic: 'The problem of the day',              members: 168, private: false, listed: true,  joined: true,  code: 'DAILY7' },
  { id: 'dp',      name: 'dynamic-prog',  topic: 'Memoization, tabulation, recurrences', members: 92,  private: false, listed: true,  joined: true,  code: 'DP2048' },
  { id: 'graphs',  name: 'graphs',        topic: 'BFS, DFS, Dijkstra & friends',         members: 74,  private: false, listed: true,  joined: false, code: 'GRAPH5' },
  { id: 'contest', name: 'contests',      topic: 'Weekly rating grind',                  members: 143, private: false, listed: true,  joined: false, code: 'CNTST9' },
  { id: 'offtop',  name: 'off-topic',     topic: 'Coffee, memes & everything else',      members: 201, private: false, listed: true,  joined: false, code: 'OFFT01' },
  { id: 'mentors', name: 'mentors-only',  topic: 'Private mentor circle',                members: 12,  private: true,  listed: false, joined: false, code: 'MNTR24' },
]

/* ---------- inline icons ---------- */

function HashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}
function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function ChevronIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function CopyIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function Avatar({ name, color, size = 36, radius = 8 }: { name: string; color: string; size?: number; radius?: number }) {
  return (
    <div
      className="chat-avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36, borderRadius: radius }}
    >
      {initials(name)}
    </div>
  )
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function genCode() {
  return Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase().padEnd(6, '0')
}

/* ---------- main ---------- */

export default function Chat() {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS)
  const [activeId, setActiveId] = useState<string>('general')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)

  const activeRoom = rooms.find(r => r.id === activeId) ?? rooms[0]
  const joinedRooms = rooms.filter(r => r.joined)
  const listedRooms = rooms.filter(r => r.listed || r.joined)

  // realtime: chat + presence for the active channel (anonymous). Lobby channels
  // are namespaced so the server durably logs their chat (practice Rooms aren't).
  const { messages, participants, you, connected, sendMessage } = useRoom(LOBBY_PREFIX + activeId)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeId])

  function send() {
    const text = draft.trim()
    if (!text) return
    sendMessage(text)
    setDraft('')
  }

  function openRoom(id: string) {
    setRooms(prev => prev.map(r => (r.id === id && !r.joined ? { ...r, joined: true, members: r.members + 1 } : r)))
    setActiveId(id)
  }

  function joinByCode(code: string): boolean {
    const room = rooms.find(r => r.code.toLowerCase() === code.trim().toLowerCase())
    if (!room) return false
    openRoom(room.id)
    setJoinOpen(false)
    return true
  }

  function createRoom(name: string, topic: string, isPrivate: boolean) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const suffix = Date.now().toString(36).slice(-4)
    let id = base || `room-${suffix}`
    if (rooms.some(r => r.id === id)) id = `${id}-${suffix}`
    setRooms(prev => [
      ...prev,
      {
        id,
        name: name.replace(/^#/, '').trim(),
        topic: topic.trim() || 'No topic set',
        members: 1,
        private: isPrivate,
        listed: !isPrivate,
        joined: true,
        code: genCode(),
      },
    ])
    setActiveId(id)
    setCreateOpen(false)
  }

  function copyCode() {
    if (!activeRoom) return
    navigator.clipboard?.writeText(activeRoom.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const onlineCount = participants.length

  return (
    <div className="slack">

      {/* ── left sidebar: channels you've joined ── */}
      <aside className="sidebar">
        <header className="side-head">
          <BrandLink to="/" size={22} />
        </header>

        <div className="side-scroll">
          <section className="side-group">
            <div className="side-heading"><span>Channels</span></div>
            <ul className="channel-list">
              {joinedRooms.map(r => {
                const isActive = r.id === activeId
                return (
                  <li key={r.id}>
                    <button
                      className={`channel${isActive ? ' channel-active' : ''}`}
                      onClick={() => setActiveId(r.id)}
                    >
                      <span className="channel-glyph">{r.private ? <LockIcon /> : <HashIcon size={15} />}</span>
                      <span className="channel-name">{r.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <footer className="side-foot">
          <div className="side-foot-avatar">
            <Avatar name={you?.name ?? 'you'} color={you?.color ?? '#3b6fb0'} size={30} radius={8} />
            <span className={`status-dot ${connected ? 'status-online' : 'status-away'}`} />
          </div>
          <div className="foot-id">
            <span className="foot-name">{you?.name ?? 'connecting…'}</span>
            <span className="foot-status">{connected ? 'active' : 'offline'}</span>
          </div>
        </footer>
      </aside>

      {/* ── main conversation ── */}
      <section className="conversation">
        {activeRoom && (
          <>
            <header className="conv-header">
              <div className="conv-title">
                <span className="conv-glyph">{activeRoom.private ? <LockIcon /> : <HashIcon size={16} />}</span>
                <span className="conv-name">{activeRoom.name}</span>
                <ChevronIcon size={14} />
              </div>
              <div className="conv-topic">{activeRoom.topic}</div>
              <button className={`code-chip${copied ? ' copied' : ''}`} onClick={copyCode} title="Copy room code">
                <span className="code-label">code</span>
                <span className="code-value">{activeRoom.code}</span>
                {copied ? <span className="code-copied">copied!</span> : <CopyIcon />}
              </button>
            </header>

            <div className="messages">
              <div className="conv-intro">
                <div className="conv-intro-glyph">
                  {activeRoom.private ? <LockIcon /> : <HashIcon size={26} />}
                </div>
                <h2>{activeRoom.private ? '🔒 ' : '#'}{activeRoom.name}</h2>
                <p>
                  This is the very beginning of the <strong>#{activeRoom.name}</strong> channel. {activeRoom.topic}.
                </p>
              </div>

              {messages.map((m: ChatMessage, i) => {
                const prev = messages[i - 1]
                const grouped = prev && prev.authorId === m.authorId
                const ts = fmtTime(m.createdAt)
                return (
                  <div key={m.id} className={`msg${grouped ? ' msg-grouped' : ''}`}>
                    <div className="msg-gutter">
                      {grouped ? <span className="msg-hovertime">{ts}</span> : <Avatar name={m.authorName} color={m.authorColor} size={36} />}
                    </div>
                    <div className="msg-body">
                      {!grouped && (
                        <div className="msg-head">
                          <span className="msg-author" style={{ color: m.authorColor }}>
                            {you && m.authorId === you.id ? 'you' : m.authorName}
                          </span>
                          <span className="msg-ts">{ts}</span>
                        </div>
                      )}
                      <div className="msg-text">{m.body}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>

            <div className="composer-wrap">
              <div className="composer">
                <div className="composer-toolbar">
                  <button className="fmt-btn" style={{ fontWeight: 700 }}>B</button>
                  <button className="fmt-btn" style={{ fontStyle: 'italic' }}>i</button>
                  <button className="fmt-btn" style={{ textDecoration: 'line-through' }}>S</button>
                  <span className="fmt-sep" />
                  <button className="fmt-btn" style={{ fontFamily: 'var(--mono)' }}>{'</>'}</button>
                  <button className="fmt-btn">🔗</button>
                </div>
                <input
                  className="composer-input"
                  placeholder={`Message #${activeRoom.name}`}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                />
                <div className="composer-actions">
                  <button className="composer-plus"><PlusIcon size={16} /></button>
                  <div className="composer-spacer" />
                  <button
                    className={`composer-send${draft.trim() ? ' active' : ''}`}
                    onClick={send}
                    disabled={!draft.trim()}
                    aria-label="Send"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── right panel: members + rooms ── */}
      <aside className="rightbar">
        <section className="rb-users">
          <div className="rb-heading rb-head">
            <span>Members</span>
            <span className="rb-count">{onlineCount} online</span>
          </div>
          <ul className="user-list">
            {participants.length === 0 && (
              <li className="user-empty">{connected ? 'No one here yet' : 'Connecting…'}</li>
            )}
            {participants.map(p => (
              <li key={p.id} className="user-row">
                <div className="user-avatar-wrap">
                  <Avatar name={p.name} color={p.color} size={26} radius={7} />
                  <span className="status-dot status-online" />
                </div>
                <span className="user-name">{you && p.id === you.id ? 'you' : p.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rb-rooms">
          <div className="rb-heading rb-heading-rooms">
            <span>Rooms</span>
            <span className="rb-count">{listedRooms.length}</span>
          </div>

          <div className="rb-room-actions">
            <button className="room-action" onClick={() => setCreateOpen(true)}>
              <PlusIcon /> Create
            </button>
            <button className="room-action" onClick={() => setJoinOpen(true)}>
              <HashIcon size={14} /> Join by code
            </button>
          </div>

          <ul className="room-switch-list">
            {listedRooms.map(r => {
              const isActive = r.id === activeId
              return (
                <li key={r.id}>
                  <button
                    className={`room-switch${isActive ? ' room-switch-active' : ''}`}
                    onClick={() => openRoom(r.id)}
                  >
                    <span className="rs-glyph">{r.private ? <LockIcon /> : <HashIcon size={15} />}</span>
                    <span className="rs-meta">
                      <span className="rs-name">{r.name}</span>
                      <span className="rs-members">{r.members} members</span>
                    </span>
                    {!r.joined && <span className="rs-join">Join</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </aside>

      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onCreate={createRoom} />}
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} onJoin={joinByCode} />}
    </div>
  )
}

/* ---------- create room modal ---------- */

function CreateModal({
  onClose, onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, topic: string, isPrivate: boolean) => void
}) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const clean = name.replace(/^#/, '').trim()
  const valid = clean.length > 0

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>Create a room</h2>
            <p className="modal-sub">Rooms are where people gather around a topic. A join code is generated automatically.</p>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close"><XIcon /></button>
        </header>

        <form
          className="modal-body"
          onSubmit={e => { e.preventDefault(); if (valid) onCreate(clean, topic, isPrivate) }}
        >
          <label className="field">
            <span className="field-label">Name</span>
            <div className="field-hash">
              <span className="field-hash-glyph">{isPrivate ? <LockIcon /> : <HashIcon size={16} />}</span>
              <input
                autoFocus
                placeholder="e.g. binary-search"
                value={name}
                maxLength={40}
                onChange={e => setName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
              />
              <span className="field-count">{40 - clean.length}</span>
            </div>
          </label>

          <label className="field">
            <span className="field-label">Topic <span className="field-opt">(optional)</span></span>
            <input
              className="field-input"
              placeholder="What's this room about?"
              value={topic}
              maxLength={80}
              onChange={e => setTopic(e.target.value)}
            />
          </label>

          <button
            type="button"
            className={`toggle-row${isPrivate ? ' on' : ''}`}
            onClick={() => setIsPrivate(p => !p)}
          >
            <div className="toggle-copy">
              <span className="field-label">Make private</span>
              <span className="toggle-desc">Hidden from the room list — people can only join with the code.</span>
            </div>
            <span className={`switch${isPrivate ? ' switch-on' : ''}`}><span className="switch-knob" /></span>
          </button>

          <footer className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!valid}>Create room</button>
          </footer>
        </form>
      </div>
    </div>
  )
}

/* ---------- join by code modal ---------- */

function JoinModal({
  onClose, onJoin,
}: {
  onClose: () => void
  onJoin: (code: string) => boolean
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit() {
    if (code.trim().length === 0) return
    if (!onJoin(code)) setError(true)
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal modal-sm" onMouseDown={e => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>Join a room</h2>
            <p className="modal-sub">Enter the code someone shared with you.</p>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close"><XIcon /></button>
        </header>

        <form className="modal-body" onSubmit={e => { e.preventDefault(); submit() }}>
          <label className="field">
            <span className="field-label">Room code</span>
            <input
              className={`field-input code-input${error ? ' field-error' : ''}`}
              autoFocus
              placeholder="e.g. GRAPH5"
              value={code}
              maxLength={10}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(false) }}
            />
            {error && <span className="field-err-msg">No room found with that code. Try again.</span>}
            <span className="field-hint">Tip: try <code>GRAPH5</code> or <code>MNTR24</code></span>
          </label>

          <footer className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!code.trim()}>Join room</button>
          </footer>
        </form>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { BrandLink } from '../../components/Logo'
import { SendIcon, LeaveIcon, ChevronIcon, SettingsIcon } from '../../components/Icons'
import { useAuth } from '../../lib/AuthContext'
import {
  useRoom, useLobbyPresence, initials, sameGroup, LOBBY_PREFIX,
  type Identity, type ChatMessage,
} from '../../lib/socket'
import { fetchChannels, type Channel } from '../../lib/channels'
import { fetchRooms, type Room } from '../../lib/rooms'
import CreateRoomModal from './CreateRoomModal'
import './Lobby.css'

/* ---------- bits ---------- */

function HashIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}

function Avatar({ person, size = 36 }: { person: Identity; size?: number }) {
  return (
    <div
      className="lb-avatar"
      style={{ width: size, height: size, background: person.color, fontSize: size * 0.36 }}
      title={person.name}
    >
      {initials(person.name)}
    </div>
  )
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/* ---------- main ---------- */

export default function Lobby() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState('')
  const [draft, setDraft] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreate, setShowCreate] = useState(false)
  // Live per-room occupancy (keyed by numeric room id) for the rooms list.
  const roomPresence = useLobbyPresence()
  const [menuOpen, setMenuOpen] = useState(false)
  const [tsTooltip, setTsTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const footRef = useRef<HTMLElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef(channelId)
  const prevFirstIdRef = useRef<number | null>(null)
  // True until the first batch of messages for a channel has been scrolled to.
  const initialScrollRef = useRef(true)
  // Set when we deliberately request an older page, so the layout effect can
  // tell a scroll-back prepend from a normal incoming message.
  const anchorRef = useRef<{ height: number; top: number } | null>(null)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  // Channels are the server's source of truth — fetch them, don't hardcode.
  // Default the selection to the first channel once the list arrives.
  useEffect(() => {
    let alive = true
    fetchChannels()
      .then((list) => {
        if (!alive) return
        setChannels(list)
        setChannelId((cur) => cur || list[0]?.id || '')
      })
      .catch(() => { /* leave the list empty; the UI shows a loading state */ })
    return () => { alive = false }
  }, [])

  // Open/active rooms for the right-hand list. Poll so rooms others create show
  // up, and refresh right after presence changes (someone joins/leaves).
  const refreshRooms = useCallback(() => {
    fetchRooms().then(setRooms).catch(() => { /* keep the last good list */ })
  }, [])

  useEffect(() => {
    refreshRooms()
    const t = setInterval(refreshRooms, 10000)
    return () => clearInterval(t)
  }, [refreshRooms])

  const channel = channels.find((c) => c.id === channelId)
  const { messages, participants, you, connected, sendMessage, loadOlder, hasMore, loadingOlder } =
    useRoom(channelId ? LOBBY_PREFIX + channelId : undefined)

  // Near the top → pull the next older page, remembering the scroll anchor.
  function handleScroll() {
    const el = scrollRef.current
    if (!el || !hasMore || loadingOlder) return
    if (el.scrollTop < 80) {
      anchorRef.current = { height: el.scrollHeight, top: el.scrollTop }
      loadOlder()
    }
  }

  // Keep the reading position stable when older messages are prepended, but
  // stick to the bottom for new messages and channel switches.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const firstId = messages[0]?.id ?? null
    const channelChanged = channelRef.current !== channelId
    if (channelChanged) {
      channelRef.current = channelId
      initialScrollRef.current = true
    }

    const prepended =
      !channelChanged &&
      anchorRef.current !== null &&
      prevFirstIdRef.current !== null &&
      firstId !== null &&
      firstId < prevFirstIdRef.current
    prevFirstIdRef.current = firstId

    if (prepended && anchorRef.current) {
      const { height, top } = anchorRef.current
      anchorRef.current = null
      el.scrollTop = el.scrollHeight - height + top
      return
    }

    anchorRef.current = null
    if (messages.length === 0) return

    if (initialScrollRef.current) {
      // First fill for this channel — jump straight to the bottom. Instant (not
      // smooth) so a follow-up render can't cut the animation off partway, which
      // left the view stranded mid-history on refresh.
      initialScrollRef.current = false
      el.scrollTop = el.scrollHeight
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, channelId])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuOpen && footRef.current && !footRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  function send() {
    const text = draft.trim()
    if (!text) return
    sendMessage(text)
    setDraft('')
  }

  return (
    <div className="slack">

      {/* ── left: channels ── */}
      <aside className="slack-side">
        <header className="slack-side-head">
          <BrandLink to="/" size={22} />
        </header>
        <div className="slack-side-scroll">
          <div className="side-group-label">Channels</div>
          <ul className="channel-list">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  className={`channel${c.id === channelId ? ' channel-active' : ''}`}
                  onClick={() => setChannelId(c.id)}
                >
                  <HashIcon size={15} />
                  <span className="channel-name">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="slack-side-foot" ref={footRef}>
          {you ? (
            <>
              <div className="member-avatar-wrap">
                <Avatar person={you} size={32} />
                <span className={`member-dot${connected ? '' : ' off'}`} />
              </div>
              <button
                className="foot-id-wrap"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <div className="foot-id">
                  <span className="foot-name">{you.name}</span>
                  <span className="foot-status">{connected ? 'active' : 'offline'}</span>
                </div>
                <ChevronIcon open={menuOpen} />
              </button>
              {menuOpen && (
                <div className="foot-dropdown">
                  <button className="foot-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/settings') }}>
                    <SettingsIcon />
                    <span>Settings</span>
                  </button>
                  <button className="foot-dropdown-item foot-dropdown-logout" onClick={() => { setMenuOpen(false); handleLogout() }}>
                    <LeaveIcon />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <span className="foot-connecting">Connecting…</span>
          )}
        </footer>
      </aside>

      {/* ── center: chat history ── */}
      <section className="slack-main">
        <header className="slack-main-head">
          <div className="slack-main-title">
            <HashIcon size={17} />
            <span className="channel-title">{channel?.name ?? '…'}</span>
          </div>
          <span className="channel-topic">{channel?.topic}</span>
        </header>

        <div className="slack-messages" ref={scrollRef} onScroll={handleScroll}>
          {loadingOlder && (
            <div className="slack-history-status">Loading earlier messages…</div>
          )}

          {!hasMore && channel && (
            <div className="channel-intro">
              <div className="channel-intro-glyph"><HashIcon size={26} /></div>
              <h2>#{channel.name}</h2>
              <p>This is the start of the <strong>#{channel.name}</strong> channel. {channel.topic}.</p>
            </div>
          )}

          {messages.map((m: ChatMessage, i) => {
            const prev = messages[i - 1]
            const grouped = sameGroup(prev, m)
            const ts = fmtTime(m.createdAt)
            const showTsTooltip = (e: React.MouseEvent<HTMLElement>) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setTsTooltip({
                text: new Date(m.createdAt).toLocaleString('en-US', { hour12: true }),
                x: rect.left + rect.width / 2,
                y: rect.top,
              })
            }
            return (
              <div key={m.id} className={`slack-msg${grouped ? ' grouped' : ''}`}>
                <div className="slack-msg-gutter">
                  {grouped
                    ? <span
                        className="slack-msg-hovertime"
                        onMouseEnter={showTsTooltip}
                        onMouseLeave={() => setTsTooltip(null)}
                      >
                        {ts}
                      </span>
                    : <Avatar person={{ id: m.authorId, name: m.authorName, color: m.authorColor }} />}
                </div>
                <div className="slack-msg-body">
                  {!grouped && (
                    <div className="slack-msg-head">
                      <span className="slack-msg-author" style={{ color: m.authorColor }}>
                        {m.authorName}
                      </span>
                      <span
                        className="slack-msg-ts"
                        onMouseEnter={showTsTooltip}
                        onMouseLeave={() => setTsTooltip(null)}
                      >
                        {ts}
                      </span>
                    </div>
                  )}
                  <div className="slack-msg-text">{m.body}</div>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        <div className="slack-composer-wrap">
          <form className="slack-composer" onSubmit={(e) => { e.preventDefault(); send() }}>
            <input
              className="slack-composer-input"
              placeholder={channel ? `Message #${channel.name}` : 'Loading channels…'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!channel}
            />
            <button type="submit" className="slack-send" aria-label="Send" disabled={!draft.trim() || !channel}>
              <SendIcon />
            </button>
          </form>
        </div>
      </section>

      {/* ── right: members (top half) + rooms (bottom half) ── */}
      <aside className="slack-members">

        {/* top half: who's in this channel */}
        <section className="members-pane">
          <header className="slack-members-head">
            <span>Members</span>
            <span className="member-count">{participants.length}</span>
          </header>
          <ul className="member-list">
            {participants.length === 0 && (
              <li className="member-empty">{connected ? 'No one here yet' : 'Connecting…'}</li>
            )}
            {participants.map((p) => (
              <li key={p.id} className="member-row">
                <div className="member-avatar-wrap">
                  <Avatar person={p} size={28} />
                  <span className="member-dot" />
                </div>
                <span className="member-name">{p.name}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* bottom half: open practice rooms */}
        <section className="rooms-pane">
          <header className="slack-members-head">
            <span>Rooms</span>
            <button className="rooms-new-btn" onClick={() => setShowCreate(true)}>+ New</button>
          </header>
          <ul className="rooms-list">
            {rooms.length === 0 ? (
              <li className="rooms-empty">No open rooms right now. Create one to get started.</li>
            ) : (
              rooms.map((r) => {
                const occ = roomPresence.get(r.id)?.length ?? r.participants.length
                const full = occ >= r.maxPlayers
                return (
                  <li key={r.id}>
                    <button className="room-card" onClick={() => navigate(`/room/${r.slug ?? r.id}`)}>
                      <div className="room-card-top">
                        <span className="room-card-title">{r.name}</span>
                        <span className={`room-diff room-diff-${r.difficulty}`}>
                          {r.difficulty}
                        </span>
                      </div>
                      {r.description && <div className="room-card-desc">{r.description}</div>}
                      <div className="room-card-meta">
                        <span className="room-host">@{r.host.username}</span>
                        <span className={`room-occ${full ? ' full' : ''}`}>{occ}/{r.maxPlayers}</span>
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </section>
      </aside>

      {showCreate && user && (
        <CreateRoomModal
          hostId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={(room) => {
            setShowCreate(false)
            navigate(`/room/${room.slug ?? room.id}`)
          }}
        />
      )}

      {tsTooltip && createPortal(
        <div className="ts-tooltip" style={{ left: tsTooltip.x, top: tsTooltip.y }}>
          {tsTooltip.text}
        </div>,
        document.body,
      )}
    </div>
  )
}

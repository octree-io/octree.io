import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLink } from '../../components/Logo'
import { SendIcon, LeaveIcon } from '../../components/Icons'
import { useAuth } from '../../lib/AuthContext'
import {
  useRoom, initials, LOBBY_PREFIX,
  type Identity, type ChatMessage,
} from '../../lib/socket'
import './Lobby.css'

/* ---------- channels (single workspace) ---------- */

const CHANNELS = [
  { id: 'general', name: 'general', topic: 'Company-wide chatter' },
  { id: 'help', name: 'help', topic: 'Stuck? Ask here' },
  { id: 'random', name: 'random', topic: 'Off-topic & memes' },
  { id: 'announcements', name: 'announcements', topic: 'What’s new' },
]

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
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [channelId, setChannelId] = useState(CHANNELS[0].id)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const channel = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0]
  const { messages, participants, you, connected, sendMessage } = useRoom(LOBBY_PREFIX + channelId)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, channelId])

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
            {CHANNELS.map((c) => (
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
        <footer className="slack-side-foot">
          {you ? (
            <>
              <div className="member-avatar-wrap">
                <Avatar person={you} size={32} />
                <span className={`member-dot${connected ? '' : ' off'}`} />
              </div>
              <div className="foot-id">
                <span className="foot-name">{you.name}</span>
                <span className="foot-status">{connected ? 'active' : 'offline'}</span>
              </div>
              <button className="foot-logout" onClick={handleLogout} title="Log out" aria-label="Log out">
                <LeaveIcon />
              </button>
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
            <span className="channel-title">{channel.name}</span>
          </div>
          <span className="channel-topic">{channel.topic}</span>
        </header>

        <div className="slack-messages">
          <div className="channel-intro">
            <div className="channel-intro-glyph"><HashIcon size={26} /></div>
            <h2>#{channel.name}</h2>
            <p>This is the start of the <strong>#{channel.name}</strong> channel. {channel.topic}.</p>
          </div>

          {messages.map((m: ChatMessage, i) => {
            const prev = messages[i - 1]
            const grouped = prev && prev.authorId === m.authorId
            const ts = fmtTime(m.createdAt)
            return (
              <div key={m.id} className={`slack-msg${grouped ? ' grouped' : ''}`}>
                <div className="slack-msg-gutter">
                  {grouped
                    ? <span className="slack-msg-hovertime">{ts}</span>
                    : <Avatar person={{ id: m.authorId, name: m.authorName, color: m.authorColor }} />}
                </div>
                <div className="slack-msg-body">
                  {!grouped && (
                    <div className="slack-msg-head">
                      <span className="slack-msg-author" style={{ color: m.authorColor }}>
                        {m.authorName}
                      </span>
                      <span className="slack-msg-ts">{ts}</span>
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
              placeholder={`Message #${channel.name}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="slack-send" aria-label="Send" disabled={!draft.trim()}>
              <SendIcon />
            </button>
          </form>
        </div>
      </section>

      {/* ── right: members + placeholder ── */}
      <aside className="slack-members">
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

        {/* placeholder pinned under the user list */}
        <div className="members-placeholder">
          <span className="placeholder-label">Placeholder</span>
        </div>
      </aside>
    </div>
  )
}

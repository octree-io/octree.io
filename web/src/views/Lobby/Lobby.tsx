import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import { useRooms } from '../../hooks/useRooms'
import { useChat } from '../../hooks/useChat'
import { useTimer } from '../../hooks/useTimer'
import { CHANNELS, USERS } from '../../data/dummy'
import type { Channel, Room } from '../../types'
import './Lobby.css'

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function RoomTimer({ room }: { room: Room }) {
  const { formatted, remaining } = useTimer(room.startedAt, room.durationMinutes)
  const color = remaining < 300 ? 'var(--red)' : remaining < 600 ? 'var(--yellow)' : 'var(--muted)'
  if (room.status !== 'active') return null
  return <span className="arc-timer" style={{ color }}>{formatted}</span>
}

function ActiveRoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const avg = room.participants.length
    ? Math.round(room.participants.reduce((s, p) => s + p.progress, 0) / room.participants.length)
    : 0
  return (
    <div className="active-room-card" onClick={onClick}>
      <div className="arc-header">
        <span className={room.status === 'active' ? 'arc-live' : 'arc-waiting'}>
          {room.status === 'active' ? 'Live' : 'Open'}
        </span>
        <span className="arc-name">{room.problem.title}</span>
        <RoomTimer room={room} />
      </div>
      <div className="arc-players">
        {room.participants.map(p => (
          <div key={p.user.id} className="arc-avatar" style={{ background: p.user.color }}>
            {p.user.username.slice(0, 2).toUpperCase()}
          </div>
        ))}
        <span className="arc-count">{room.participants.length} / {room.maxPlayers}</span>
      </div>
      {room.status === 'active' && (
        <div className="arc-bar-bg"><div className="arc-bar" style={{ width: `${avg}%` }} /></div>
      )}
    </div>
  )
}

export default function Lobby() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { rooms, createRoom } = useRooms()
  const [activeChannelId, setActiveChannelId] = useState('ch-general')
  const { messages, draft, setDraft, send, react } = useChat(activeChannelId)
  const feedRef = useRef<HTMLDivElement>(null)

  const activeChannel = CHANNELS.find(c => c.id === activeChannelId)
  const textChannels = CHANNELS.filter(c => c.type === 'channel')
  const dmChannels = CHANNELS.filter(c => c.type === 'dm')
  const liveRooms = rooms.filter(r => r.status === 'active' || r.status === 'waiting')

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight })
  }, [messages])

  function handleSend() {
    send()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleCreateRoom() {
    const room = createRoom('design-youtube', user)
    navigate(`/room/${room.id}`)
  }

  function handleJoinRoom(room: Room) {
    navigate(`/room/${room.id}`)
  }

  // Group messages: detect consecutive messages by the same user
  const grouped = messages.reduce<{ first: typeof messages[0]; rest: typeof messages }[]>((acc, msg) => {
    const last = acc[acc.length - 1]
    const prevMsg = last?.rest[last.rest.length - 1] ?? last?.first
    const sameUser = prevMsg?.user.id === msg.user.id
    const closeInTime = prevMsg && (msg.timestamp.getTime() - prevMsg.timestamp.getTime()) < 5 * 60 * 1000
    if (sameUser && closeInTime) {
      last.rest.push(msg)
    } else {
      acc.push({ first: msg, rest: [] })
    }
    return acc
  }, [])

  return (
    <div className="lobby">
      {/* WORKSPACE ICON RAIL */}
      <div className="ws-sidebar">
        <div className="ws-logo">ot</div>
        <div className="ws-sep" />
        <button className="ws-icon active" title="Lobby">💬</button>
        <button className="ws-icon" title="Practice rooms" onClick={() => navigate('/room/room-1')}>🎮</button>
        <button className="ws-icon" title="Problems">📝
          <span className="ws-badge">3</span>
        </button>
        <button className="ws-icon" title="Leaderboard">🏆</button>
        <div className="ws-bottom">
          <button className="ws-icon" title="Settings">⚙️</button>
          <div className="ws-user-avatar" style={{ background: user.color }}>
            {user.username.slice(0, 2).toUpperCase()}
            <span className="ws-status" />
          </div>
        </div>
      </div>

      {/* CHANNEL SIDEBAR */}
      <div className="ch-sidebar">
        <div className="ch-header">
          <div className="workspace-name">
            <h2>oct<span>ree</span>.io</h2>
            <button className="icon-btn">⌄</button>
          </div>
          <div className="status-row">
            <span className="status-indicator" />
            <span className="status-text">1,247 online now</span>
          </div>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search channels, people…" />
          </div>
        </div>

        <div className="ch-body">
          {/* Channels */}
          <div className="ch-section-header">
            <span className="ch-section-label">Channels</span>
            <button className="ch-section-add">＋</button>
          </div>
          {textChannels.map(ch => (
            <ChannelItem
              key={ch.id}
              ch={ch}
              active={activeChannelId === ch.id}
              onClick={() => setActiveChannelId(ch.id)}
            />
          ))}

          {/* Active rooms */}
          <div className="ch-section-header" style={{ marginTop: 8 }}>
            <span className="ch-section-label">🎮 Active Rooms</span>
            <button className="ch-section-add" onClick={handleCreateRoom}>＋</button>
          </div>
          {liveRooms.map(room => (
            <RoomChannelItem key={room.id} room={room} onClick={() => handleJoinRoom(room)} />
          ))}

          {/* DMs */}
          <div className="ch-section-header" style={{ marginTop: 8 }}>
            <span className="ch-section-label">Direct Messages</span>
            <button className="ch-section-add">＋</button>
          </div>
          {dmChannels.map(ch => (
            <DmItem
              key={ch.id}
              ch={ch}
              active={activeChannelId === ch.id}
              onClick={() => setActiveChannelId(ch.id)}
            />
          ))}
        </div>

        {/* User footer */}
        <div className="ch-footer">
          <div className="user-footer-avatar" style={{ background: user.color }}>
            {user.username.slice(0, 2).toUpperCase()}
            <span className="user-online" />
          </div>
          <div className="user-info">
            <div className="user-footer-name">{user.username}</div>
            <div className="user-footer-status">🎮 Online</div>
          </div>
          <div className="user-footer-actions">
            <button className="icon-btn" title="Mute">🎙</button>
            <button className="icon-btn" title="Settings">⚙️</button>
          </div>
        </div>
      </div>

      {/* CHAT MAIN */}
      <div className="chat-main">
        <div className="chat-topbar">
          <span className="chat-channel-icon">{activeChannel?.type === 'dm' ? '👤' : '#'}</span>
          <span className="chat-channel-name">{activeChannel?.name ?? activeChannelId}</span>
          {activeChannel?.type === 'channel' && (
            <span className="chat-channel-desc">General discussion for all things system design</span>
          )}
          <div className="topbar-spacer" />
          <span className="online-count">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            847 online
          </span>
          <div className="topbar-actions">
            <button className="topbar-btn">🔍 Search</button>
            <button className="topbar-btn">📌 Pinned</button>
            <button className="topbar-btn-primary" onClick={handleCreateRoom}>+ New Room</button>
          </div>
        </div>

        <div className="chat-feed" ref={feedRef}>
          <div className="date-divider">Today</div>

          {grouped.map(({ first, rest }) => (
            <MessageGroup key={first.id} first={first} rest={rest} onReact={react} />
          ))}
        </div>

        <div className="chat-input-section">
          <div className="input-box">
            <div className="input-toolbar">
              <button className="input-tool"><strong>B</strong></button>
              <button className="input-tool"><em>I</em></button>
              <button className="input-tool" style={{ fontFamily: 'monospace' }}>&lt;&gt;</button>
              <button className="input-tool">🔗</button>
              <span className="input-sep" />
              <button className="input-tool">☰</button>
              <button className="input-tool">❝</button>
            </div>
            <div className="input-main">
              <textarea
                className="input-field"
                placeholder={`Message ${activeChannel?.type === 'dm' ? activeChannel.name : `#${activeChannel?.name}`}`}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="input-actions">
                <button className="icon-btn" title="Emoji">😊</button>
                <button className="icon-btn" title="Attach">📎</button>
                <button className="send-btn" onClick={handleSend}>Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="rp-header">
          Channel info
          <button className="icon-btn">✕</button>
        </div>
        <div className="rp-body">
          <div className="rp-section">
            <div className="rp-section-title">Active rooms ({liveRooms.length})</div>
            {liveRooms.map(room => (
              <ActiveRoomCard key={room.id} room={room} onClick={() => handleJoinRoom(room)} />
            ))}
            <button className="rp-btn" onClick={handleCreateRoom}>+ Create New Room</button>
          </div>
          <div className="rp-section">
            <div className="rp-section-title">Online members ({USERS.length})</div>
            {USERS.map((u, i) => (
              <div key={u.id} className="member-item">
                <div className="mi-avatar-wrap">
                  <div className="mi-avatar" style={{ background: u.color }}>
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`mi-dot ${i < 4 ? 'dot-green' : 'dot-muted'}`} />
                </div>
                <span className="member-name">{u.username}</span>
                {i === 0 && <span className="member-role">Top 10</span>}
                {i === 4 && <span className="member-role">Mod</span>}
              </div>
            ))}
            <div className="see-more">+ 841 more online</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function ChannelItem({ ch, active, onClick }: { ch: Channel; active: boolean; onClick: () => void }) {
  const isUnread = (ch.unreadCount ?? 0) > 0 || (ch.mentionCount ?? 0) > 0
  return (
    <div className={`ch-item ${active ? 'active' : ''} ${isUnread ? 'unread' : ''}`} onClick={onClick}>
      <span className="ch-item-icon">#</span>
      <span className="ch-item-name">{ch.name}</span>
      {ch.mentionCount ? <span className="ch-mention-badge">@{ch.mentionCount}</span> : null}
      {!ch.mentionCount && ch.unreadCount ? <span className="ch-badge">{ch.unreadCount}</span> : null}
    </div>
  )
}

function DmItem({ ch, active, onClick }: { ch: Channel; active: boolean; onClick: () => void }) {
  const isUnread = (ch.unreadCount ?? 0) > 0
  const u = USERS.find(u => u.username === ch.name)
  return (
    <div className={`dm-item ${active ? 'active' : ''} ${isUnread ? 'unread' : ''}`} onClick={onClick}>
      <div className="dm-avatar-wrap">
        <div className="dm-avatar" style={{ background: u?.color ?? 'var(--purple-dim)' }}>
          {ch.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="dm-dot dot-green" />
      </div>
      <span className="dm-name">{ch.name}</span>
      {ch.unreadCount ? <span className="ch-badge">{ch.unreadCount}</span> : null}
    </div>
  )
}

function RoomChannelItem({ room, onClick }: { room: Room; onClick: () => void }) {
  const { formatted } = useTimer(room.startedAt, room.durationMinutes)
  return (
    <div className="room-ch-item" onClick={onClick}>
      <div className="room-ch-header">
        <span className={room.status === 'active' ? 'tag-live-sm' : 'tag-open-sm'}>
          {room.status === 'active' ? 'Live' : 'Open'}
        </span>
        <span className="room-ch-name">{room.problem.title}</span>
        {room.status === 'active' && (
          <span className="room-ch-timer" style={{ color: 'var(--red)' }}>{formatted}</span>
        )}
      </div>
      <div className="room-ch-players">
        {room.participants.map(p => p.user.username).join(' · ')}
      </div>
    </div>
  )
}

type Msg = typeof import('../../data/dummy').MESSAGES[0]

function MessageGroup({ first, rest, onReact }: { first: Msg; rest: Msg[]; onReact: (id: string, emoji: string) => void }) {
  return (
    <>
      <div className="msg-group">
        <div className="msg-group-avatar" style={{ background: first.user.color }}>
          {first.user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="msg-body">
          <div className="msg-header">
            <span className="msg-sender" style={{ color: first.user.color }}>{first.user.username}</span>
            <span className="msg-ts">{fmtTime(first.timestamp)}</span>
          </div>
          <MessageContent msg={first} onReact={onReact} />
        </div>
      </div>
      {rest.map(msg => (
        <div key={msg.id} className="msg-continued">
          <span className="msg-time-spacer">{fmtTime(msg.timestamp)}</span>
          <div className="msg-body">
            <MessageContent msg={msg} onReact={onReact} />
          </div>
        </div>
      ))}
    </>
  )
}

function MessageContent({ msg, onReact }: { msg: Msg; onReact: (id: string, emoji: string) => void }) {
  return (
    <>
      <div className="msg-text">{renderText(msg.text)}</div>
      {msg.codeBlock && (
        <>
          <div className="code-block-header">
            <span>{msg.codeBlock.label}</span>
            <button className="code-copy">⎘ Copy</button>
          </div>
          <pre className="code-block">{msg.codeBlock.code}</pre>
        </>
      )}
      {msg.reactions && msg.reactions.length > 0 && (
        <div className="reactions">
          {msg.reactions.map(r => (
            <button
              key={r.emoji}
              className={`reaction ${r.mine ? 'mine' : ''}`}
              onClick={() => onReact(msg.id, r.emoji)}
            >
              {r.emoji} <span className="reaction-count">{r.count}</span>
            </button>
          ))}
        </div>
      )}
      {msg.threadCount && (
        <div className="thread-hint">
          <span className="thread-hint-text">{msg.threadCount} replies</span>
          <span className="thread-hint-count">· Last reply today</span>
        </div>
      )}
    </>
  )
}

function renderText(text: string) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  )
}

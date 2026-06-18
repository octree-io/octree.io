import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRooms } from '../../hooks/useRooms'
import { useTimer } from '../../hooks/useTimer'
import { useUser } from '../../contexts/UserContext'
import { PROBLEMS } from '../../data/dummy'
import type { Room } from '../../types'
import './RoomEntry.css'

function roomCode(room: Room) {
  return room.id.replace(/^room-/, '').toUpperCase()
}

function normalize(value: string) {
  return value.trim().replace(/^#/, '').toLowerCase()
}

function RoomStatus({ room }: { room: Room }) {
  const { formatted, remaining } = useTimer(room.startedAt, room.durationMinutes)

  if (room.status === 'waiting') {
    return <span className="entry-room-state waiting">Waiting</span>
  }

  if (room.status === 'finished') {
    return <span className="entry-room-state finished">Finished</span>
  }

  return (
    <span className={remaining < 300 ? 'entry-room-state urgent' : 'entry-room-state live'}>
      {formatted}
    </span>
  )
}

function RoomCard({ room, onJoin }: { room: Room; onJoin: (room: Room) => void }) {
  const seatsLeft = room.maxPlayers - room.participants.length
  const isFull = seatsLeft <= 0

  return (
    <article className="entry-room-card">
      <div className="entry-room-top">
        <RoomStatus room={room} />
        <span className="entry-room-code">#{roomCode(room)}</span>
      </div>

      <h3>{room.problem.title}</h3>
      <p>{room.problem.description}</p>

      <div className="entry-room-meta">
        <span>{room.problem.difficulty}</span>
        <span>{room.durationMinutes} min</span>
        <span>{room.participants.length}/{room.maxPlayers} seats</span>
      </div>

      <div className="entry-room-footer">
        <div className="entry-avatars" aria-label={`${room.participants.length} participants`}>
          {room.participants.map(participant => (
            <span
              key={participant.user.id}
              className="entry-avatar"
              style={{ background: participant.user.color }}
              title={participant.user.username}
            >
              {participant.user.username.slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
        <button className="entry-secondary-button" type="button" disabled={isFull} onClick={() => onJoin(room)}>
          {isFull ? 'Full' : 'Join'}
        </button>
      </div>
    </article>
  )
}

export default function RoomEntry() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { rooms, createRoom, joinRoom, activeCount, waitingCount } = useRooms()
  const [problemSlug, setProblemSlug] = useState(PROBLEMS[0]?.slug ?? '')
  const [joinValue, setJoinValue] = useState('')
  const [error, setError] = useState('')

  const openRooms = useMemo(
    () => rooms.filter(room => room.status !== 'finished'),
    [rooms],
  )

  function enterRoom(room: Room) {
    const isParticipant = room.participants.some(participant => participant.user.id === user.id)
    const isFull = room.participants.length >= room.maxPlayers

    if (!isParticipant && isFull) {
      setError('That room is full.')
      return
    }

    joinRoom(room.id, user)
    navigate(`/room/${room.id}`)
  }

  function handleCreate() {
    const room = createRoom(problemSlug, user)
    navigate(`/room/${room.id}`)
  }

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const requested = normalize(joinValue)
    const room = rooms.find(candidate => {
      const id = candidate.id.toLowerCase()
      const code = candidate.id.replace(/^room-/, '').toLowerCase()
      return id === requested || code === requested
    })

    if (!room) {
      setError('No room matched that code.')
      return
    }

    enterRoom(room)
  }

  return (
    <main className="entry-shell">
      <section className="entry-hero" aria-labelledby="entry-title">
        <div className="entry-brand">oct<span>ree</span>.io</div>
        <div className="entry-grid">
          <div className="entry-copy">
            <p className="entry-kicker">{activeCount} live rooms / {waitingCount} waiting</p>
            <h1 id="entry-title">Start or join a system design room.</h1>
            <p className="entry-subtitle">
              Pick a problem, create a room, or enter a room code from a teammate. The whiteboard room stays exactly where the work happens.
            </p>
          </div>

          <div className="entry-panel" aria-label="Create or join room">
            <div className="entry-panel-section">
              <label htmlFor="problem">Problem</label>
              <select id="problem" value={problemSlug} onChange={event => setProblemSlug(event.target.value)}>
                {PROBLEMS.map(problem => (
                  <option key={problem.id} value={problem.slug}>
                    {problem.title} ({problem.difficulty})
                  </option>
                ))}
              </select>
              <button className="entry-primary-button" type="button" onClick={handleCreate}>
                Start room
              </button>
            </div>

            <div className="entry-divider" />

            <form className="entry-panel-section" onSubmit={handleJoin}>
              <label htmlFor="room-code">Room code</label>
              <div className="entry-join-row">
                <input
                  id="room-code"
                  value={joinValue}
                  onChange={event => {
                    setJoinValue(event.target.value)
                    setError('')
                  }}
                  placeholder="room-1 or 1"
                />
                <button className="entry-secondary-button" type="submit">Join</button>
              </div>
              {error && <p className="entry-error">{error}</p>}
            </form>
          </div>
        </div>
      </section>

      <section className="entry-rooms" aria-labelledby="open-rooms-title">
        <div className="entry-section-heading">
          <div>
            <p className="entry-kicker">Open rooms</p>
            <h2 id="open-rooms-title">Join an existing session</h2>
          </div>
          <span>{openRooms.length} available</span>
        </div>

        <div className="entry-room-list">
          {openRooms.map(room => (
            <RoomCard key={room.id} room={room} onJoin={enterRoom} />
          ))}
        </div>
      </section>
    </main>
  )
}

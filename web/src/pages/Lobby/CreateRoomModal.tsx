import { useEffect, useState, type FormEvent } from 'react'
import { XIcon } from '../../components/Icons'
import { createRoom, type Difficulty, type Room } from '../../lib/rooms'
import { randomRoomName, randomRoomDescription } from '../../lib/roomGen'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export default function CreateRoomModal({
  hostId,
  onClose,
  onCreated,
}: {
  hostId: number
  onClose: () => void
  onCreated: (room: Room) => void
}) {
  // Seed with an auto-generated name so the modal never opens empty.
  const [name, setName] = useState(() => randomRoomName())
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    setError(null)
    try {
      const room = await createRoom({
        name: trimmed,
        description: description.trim(),
        difficulty,
        hostId,
      })
      onCreated(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create room')
      setCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2>Create a room</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <div className="modal-label-row">
              <label htmlFor="room-name">Name</label>
              <button type="button" className="modal-auto" onClick={() => setName(randomRoomName())}>
                Auto-generate
              </button>
            </div>
            <input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your room a name"
              maxLength={60}
              autoComplete="off"
            />
          </div>

          <div className="modal-field">
            <div className="modal-label-row">
              <label htmlFor="room-desc">Description</label>
              <button
                type="button"
                className="modal-auto"
                onClick={() => setDescription(randomRoomDescription(difficulty))}
              >
                Auto-generate
              </button>
            </div>
            <textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about? (optional)"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="modal-field">
            <label>Difficulty</label>
            <div className="modal-difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`diff-pill diff-pill-${d}${difficulty === d ? ' selected' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn-primary modal-btn-create"
              disabled={creating || !name.trim()}
            >
              {creating ? 'Creating…' : 'Create room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

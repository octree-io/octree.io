import { API_URL } from './socket'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Room {
  id: number
  slug: string | null
  name: string
  description: string
  difficulty: Difficulty
  status: 'waiting' | 'active' | 'finished'
  durationMinutes: number
  maxPlayers: number
  problem: { id: number; title: string; difficulty: Difficulty; slug: string } | null
  host: { id: number; username: string }
  participants: { userId: number; user: { id: number; username: string } }[]
  createdAt: string
}

const BASE = `${API_URL}/api`

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.error) || 'Request failed')
  return data as T
}

/** Open + active rooms, newest first. */
export function fetchRooms(): Promise<Room[]> {
  return json<Room[]>('/rooms')
}

export function createRoom(body: {
  name: string
  description: string
  difficulty: Difficulty
  hostId: number
}): Promise<Room> {
  return json<Room>('/rooms', { method: 'POST', body: JSON.stringify(body) })
}

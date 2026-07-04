import { API_URL } from './socket'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type RoomStatus = 'waiting' | 'active' | 'finished'

export interface RoomSummary {
  id: number
  slug: string | null
  status: RoomStatus
  maxPlayers: number
  problem: { id: number; title: string; difficulty: Difficulty; slug: string } | null
  host: { id: number; username: string } | null
  participants: { user: { id: number; username: string } }[]
}

/** Open + active practice rooms for the lobby directory. */
export async function fetchRooms(): Promise<RoomSummary[]> {
  const res = await fetch(`${API_URL}/rooms`)
  if (!res.ok) throw new Error(`Failed to load rooms (${res.status})`)
  return res.json()
}

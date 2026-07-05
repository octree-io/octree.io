import { API_URL } from './socket'

export interface Channel {
  id: string
  name: string
  topic: string
}

/** The canonical Chat channel list, served by the API (GET /api/channels). */
export async function fetchChannels(): Promise<Channel[]> {
  const res = await fetch(`${API_URL}/api/channels`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load channels')
  return res.json()
}

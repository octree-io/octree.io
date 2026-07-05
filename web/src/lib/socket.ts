import { io, type Socket } from 'socket.io-client'
import { useCallback, useEffect, useRef, useState } from 'react'

/* ---------- shared event contract (mirrors api/src/realtime/types.ts) ---------- */

export interface Identity {
  id: string
  name: string
  color: string
}

export interface ChatMessage {
  id: number
  roomId: string
  authorId: string
  authorName: string
  authorColor: string
  body: string
  createdAt: string
}

export interface Problem {
  id: number
  slug: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
}

export interface Round {
  number: number
  endsAt: string | null
}

export interface LobbyRoomPresence {
  roomId: number
  participants: Identity[]
}

interface RoomState {
  roomId: string
  you: Identity
  participants: Identity[]
  messages: ChatMessage[]
  problem: Problem | null
  round: Round | null
}

interface ServerToClientEvents {
  'room:state': (p: RoomState) => void
  'chat:message': (p: ChatMessage) => void
  'presence:update': (p: { roomId: string; participants: Identity[] }) => void
  'room:problem': (p: { roomId: string; problem: Problem; round: Round }) => void
  'lobby:rooms': (p: { rooms: LobbyRoomPresence[] }) => void
  'lobby:presence': (p: LobbyRoomPresence) => void
  'error:msg': (p: { message: string }) => void
}

interface HistoryResult {
  messages: ChatMessage[]
  hasMore: boolean
}

interface ClientToServerEvents {
  'room:join': (p: { roomId: string; name?: string }) => void
  'chat:send': (p: { body: string }) => void
  'chat:history': (p: { before: number; limit?: number }, cb: (res: HistoryResult) => void) => void
  'lobby:join': () => void
  'lobby:leave': () => void
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/* ---------- singleton socket ---------- */

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    // withCredentials sends the session cookie so the server can authenticate
    // the handshake (login is required to connect).
    socket = io(API_URL, { transports: ['websocket', 'polling'], withCredentials: true })
  }
  return socket
}

/**
 * Force the realtime socket to re-authenticate. The server caches the user's
 * identity (incl. username) at handshake time, so after a profile change we
 * reconnect to pull the fresh identity — the next `room:join` then broadcasts
 * the updated name. No-op if the socket was never opened.
 */
export function refreshSocketIdentity(): void {
  if (socket) {
    socket.disconnect().connect()
  }
}

/* ---------- useRoom hook ---------- */

// Initial history page size; mirrors HISTORY_PAGE on the server. Used to seed
// `hasMore` — a full first page means older messages may exist to page back to.
export const HISTORY_PAGE = 50

export interface UseRoom {
  connected: boolean
  you: Identity | null
  participants: Identity[]
  messages: ChatMessage[]
  problem: Problem | null
  round: Round | null
  sendMessage: (body: string) => void
  /** Load the next older page of messages (scroll-back pagination). */
  loadOlder: () => void
  /** Whether older messages remain to be loaded. */
  hasMore: boolean
  /** True while an older page is in flight. */
  loadingOlder: boolean
}

/**
 * Namespace for durably-logged Chat lobby channels. Only rooms whose id carries
 * this prefix have their chat history loaded and persisted; practice Rooms (and
 * anything else) are ephemeral. Mirrors the rule in api/src/realtime.
 */
export const LOBBY_PREFIX = 'lobby:'

/**
 * Join a realtime room (a practice-room UUID or a Chat channel slug) as an
 * anonymous user. Streams chat + presence, and — for practice rooms — the
 * current problem and the round timer, switching when the server rotates it.
 */
export function useRoom(roomId: string | undefined, name?: string): UseRoom {
  const [connected, setConnected] = useState(false)
  const [you, setYou] = useState<Identity | null>(null)
  const [participants, setParticipants] = useState<Identity[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [problem, setProblem] = useState<Problem | null>(null)
  const [round, setRound] = useState<Round | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)

  // Refs let the stable `loadOlder` callback read live values without deps.
  const messagesRef = useRef<ChatMessage[]>([])
  const hasMoreRef = useRef(false)
  const loadingRef = useRef(false)
  messagesRef.current = messages
  hasMoreRef.current = hasMore

  useEffect(() => {
    if (!roomId) return
    const s = getSocket()

    // reset so a room switch doesn't flash the previous room's data
    setMessages([])
    setParticipants([])
    setProblem(null)
    setRound(null)
    setHasMore(false)
    setLoadingOlder(false)
    loadingRef.current = false

    const join = () => {
      setConnected(true)
      s.emit('room:join', { roomId, name })
    }
    const onState = (state: RoomState) => {
      if (state.roomId !== roomId) return
      setYou(state.you)
      setParticipants(state.participants)
      setMessages(state.messages)
      setProblem(state.problem)
      setRound(state.round)
      // A full first page implies there may be older messages to page back to.
      setHasMore(state.messages.length >= HISTORY_PAGE)
    }
    const onMessage = (m: ChatMessage) => {
      if (m.roomId === roomId) setMessages((prev) => [...prev, m])
    }
    const onPresence = (p: { roomId: string; participants: Identity[] }) => {
      if (p.roomId === roomId) setParticipants(p.participants)
    }
    const onProblem = (p: { roomId: string; problem: Problem; round: Round }) => {
      if (p.roomId !== roomId) return
      setProblem(p.problem)
      setRound(p.round)
    }
    const onDisconnect = () => setConnected(false)

    s.on('connect', join)
    s.on('room:state', onState)
    s.on('chat:message', onMessage)
    s.on('presence:update', onPresence)
    s.on('room:problem', onProblem)
    s.on('disconnect', onDisconnect)

    if (s.connected) join()

    return () => {
      s.off('connect', join)
      s.off('room:state', onState)
      s.off('chat:message', onMessage)
      s.off('presence:update', onPresence)
      s.off('room:problem', onProblem)
      s.off('disconnect', onDisconnect)
    }
  }, [roomId, name])

  const sendMessage = useCallback((body: string) => {
    const text = body.trim()
    if (text) getSocket().emit('chat:send', { body: text })
  }, [])

  const loadOlder = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return
    // Cursor = oldest currently-loaded message. Ephemeral messages have ids ≤ 0
    // and no server-side history, so there's nothing to page.
    const oldest = messagesRef.current[0]
    if (!oldest || oldest.id <= 0) return

    loadingRef.current = true
    setLoadingOlder(true)
    getSocket().emit('chat:history', { before: oldest.id }, (res) => {
      loadingRef.current = false
      setLoadingOlder(false)
      setHasMore(res.hasMore)
      if (res.messages.length) {
        // Drop any that raced in via live updates, then prepend.
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id))
          const older = res.messages.filter((m) => !known.has(m.id))
          return older.length ? [...older, ...prev] : prev
        })
      }
    })
  }, [])

  return { connected, you, participants, messages, problem, round, sendMessage, loadOlder, hasMore, loadingOlder }
}

/* ---------- useLobbyPresence hook ---------- */

/**
 * Subscribe to live occupancy of every practice room, keyed by numeric room id.
 * The lobby renders each room's people icons from this without joining the room.
 */
export function useLobbyPresence(): Map<number, Identity[]> {
  const [byRoom, setByRoom] = useState<Map<number, Identity[]>>(new Map())

  useEffect(() => {
    const s = getSocket()

    const onRooms = ({ rooms }: { rooms: LobbyRoomPresence[] }) => {
      setByRoom(new Map(rooms.map((r) => [r.roomId, r.participants])))
    }
    const onPresence = ({ roomId, participants }: LobbyRoomPresence) => {
      setByRoom((prev) => {
        const next = new Map(prev)
        if (participants.length === 0) next.delete(roomId)
        else next.set(roomId, participants)
        return next
      })
    }
    const subscribe = () => s.emit('lobby:join')

    s.on('connect', subscribe)
    s.on('lobby:rooms', onRooms)
    s.on('lobby:presence', onPresence)
    if (s.connected) subscribe()

    return () => {
      s.emit('lobby:leave')
      s.off('connect', subscribe)
      s.off('lobby:rooms', onRooms)
      s.off('lobby:presence', onPresence)
    }
  }, [])

  return byRoom
}

/* ---------- helpers ---------- */

export function initials(name: string): string {
  const parts = name.split(/[-\s_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

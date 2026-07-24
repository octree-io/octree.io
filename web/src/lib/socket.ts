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

// A solver's finish order for the room's current problem. `id` matches a
// roster identity id, so the sidebar can badge names directly.
export interface SolveRank {
  id: string
  rank: number
}

export type RoomPhase = 'solving' | 'review'

// A peer's shared editor buffer. While solving, `code` is a scrambled decoy and
// `redacted` is true (the real source stays server-side); in review it's the
// genuine code. `authorId` matches a roster identity id.
export interface PeerCode {
  authorId: string
  lang: string
  code: string
  redacted: boolean
}

export interface Round {
  number: number
  phase: RoomPhase
  endsAt: string | null
}

export interface LobbyRoomPresence {
  roomId: number
  participants: Identity[]
}

interface RoomState {
  roomId: string
  you: Identity
  youAreHost: boolean
  participants: Identity[]
  messages: ChatMessage[]
  problem: Problem | null
  round: Round | null
  solves: SolveRank[]
  peers: PeerCode[]
}

interface ServerToClientEvents {
  'room:state': (p: RoomState) => void
  'chat:message': (p: ChatMessage) => void
  'presence:update': (p: { roomId: string; participants: Identity[] }) => void
  'room:solves': (p: { roomId: string; solves: SolveRank[] }) => void
  'peer:code': (p: { roomId: string } & PeerCode) => void
  'room:problem': (p: { roomId: string; problem: Problem | null; round: Round }) => void
  'lobby:rooms': (p: { rooms: LobbyRoomPresence[] }) => void
  'lobby:presence': (p: LobbyRoomPresence) => void
  'room:closed': (p: { roomId: string }) => void
  'error:msg': (p: { message: string }) => void
}

interface HistoryResult {
  messages: ChatMessage[]
  hasMore: boolean
}

interface ClientToServerEvents {
  'room:join': (p: { roomId: string; name?: string }) => void
  'chat:send': (p: { body: string }) => void
  'code:update': (p: { lang: string; code: string }) => void
  'room:close': () => void
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

// Cap on how many messages we keep mounted in the DOM at once. A long session
// (thousands of messages) would otherwise render every node and bog the tab
// down. When live messages push past this, we drop the oldest from the DOM —
// they stay in the DB and remain reachable by scrolling back up.
export const MAX_RENDERED = 300

export interface UseRoom {
  connected: boolean
  you: Identity | null
  participants: Identity[]
  messages: ChatMessage[]
  problem: Problem | null
  round: Round | null
  /** Finish-order badges for the current problem, reset each round. */
  solves: SolveRank[]
  /** Peers' shared editor buffers, keyed by identity id (redacted while solving). */
  peerCode: Map<string, PeerCode>
  sendMessage: (body: string) => void
  /** Share your current editor buffer with the room. */
  sendCode: (lang: string, code: string) => void
  /** Whether the signed-in user hosts this room (may close it). */
  youAreHost: boolean
  /** Ask the server to close this room (host only). */
  closeRoom: () => void
  /** True once the room has been closed (by the host or auto-closed). */
  closed: boolean
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
  const [solves, setSolves] = useState<SolveRank[]>([])
  const [peerCode, setPeerCode] = useState<Map<string, PeerCode>>(new Map())
  const [youAreHost, setYouAreHost] = useState(false)
  const [closed, setClosed] = useState(false)
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
    setSolves([])
    setPeerCode(new Map())
    setYouAreHost(false)
    setClosed(false)
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
      setYouAreHost(state.youAreHost)
      setParticipants(state.participants)
      setMessages(state.messages)
      setProblem(state.problem)
      setRound(state.round)
      setSolves(state.solves ?? [])
      setPeerCode(new Map((state.peers ?? []).map((p) => [p.authorId, p])))
      // A full first page implies there may be older messages to page back to.
      setHasMore(state.messages.length >= HISTORY_PAGE)
    }
    const onClosed = (p: { roomId: string }) => {
      if (p.roomId === roomId) setClosed(true)
    }
    const persistent = roomId.startsWith(LOBBY_PREFIX)
    const onMessage = (m: ChatMessage) => {
      if (m.roomId !== roomId) return
      setMessages((prev) =>
        prev.length >= MAX_RENDERED ? [...prev.slice(prev.length - MAX_RENDERED + 1), m] : [...prev, m],
      )
      // If this pushes us past the cap we're dropping the oldest from view; for
      // persistent channels those rows live in the DB, so older history can be
      // paged back to. (messagesRef holds the last committed length.)
      if (persistent && messagesRef.current.length + 1 > MAX_RENDERED) setHasMore(true)
    }
    const onPresence = (p: { roomId: string; participants: Identity[] }) => {
      if (p.roomId === roomId) setParticipants(p.participants)
    }
    const onProblem = (p: { roomId: string; problem: Problem | null; round: Round }) => {
      if (p.roomId !== roomId) return
      setProblem(p.problem)
      setRound(p.round)
      // A new round starts on a fresh problem — clear the finish-order medals
      // and everyone's shared buffers (they reset to starter code).
      // (The solving→review transition keeps the same problem, so leave them.)
      if (p.round.phase === 'solving') {
        setSolves([])
        setPeerCode(new Map())
      }
    }
    const onSolves = (p: { roomId: string; solves: SolveRank[] }) => {
      if (p.roomId === roomId) setSolves(p.solves)
    }
    const onPeerCode = (p: { roomId: string } & PeerCode) => {
      if (p.roomId !== roomId) return
      setPeerCode((prev) => {
        const next = new Map(prev)
        next.set(p.authorId, { authorId: p.authorId, lang: p.lang, code: p.code, redacted: p.redacted })
        return next
      })
    }
    const onDisconnect = () => setConnected(false)

    s.on('connect', join)
    s.on('room:state', onState)
    s.on('chat:message', onMessage)
    s.on('presence:update', onPresence)
    s.on('room:problem', onProblem)
    s.on('room:solves', onSolves)
    s.on('peer:code', onPeerCode)
    s.on('room:closed', onClosed)
    s.on('disconnect', onDisconnect)

    if (s.connected) join()

    return () => {
      s.off('connect', join)
      s.off('room:state', onState)
      s.off('chat:message', onMessage)
      s.off('presence:update', onPresence)
      s.off('room:problem', onProblem)
      s.off('room:solves', onSolves)
      s.off('peer:code', onPeerCode)
      s.off('room:closed', onClosed)
      s.off('disconnect', onDisconnect)
    }
  }, [roomId, name])

  const sendMessage = useCallback((body: string) => {
    const text = body.trim()
    if (text) getSocket().emit('chat:send', { body: text })
  }, [])

  const closeRoom = useCallback(() => {
    getSocket().emit('room:close')
  }, [])

  const sendCode = useCallback((lang: string, code: string) => {
    getSocket().emit('code:update', { lang, code })
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

  return {
    connected, you, participants, messages, problem, round, solves, peerCode,
    sendMessage, sendCode, youAreHost, closeRoom, closed, loadOlder, hasMore, loadingOlder,
  }
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

// Consecutive messages from the same author collapse into one visual group,
// unless the author's name changed (e.g. a username update) or more than this
// long has passed since their previous message.
const GROUP_WINDOW_MS = 15 * 60 * 1000

export function sameGroup(prev: ChatMessage | undefined, m: ChatMessage): boolean {
  if (!prev) return false
  if (prev.authorId !== m.authorId) return false
  if (prev.authorName !== m.authorName) return false
  const gap = new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return Number.isFinite(gap) && gap < GROUP_WINDOW_MS
}

import { io, type Socket } from 'socket.io-client'
import { useCallback, useEffect, useState } from 'react'

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
  'error:msg': (p: { message: string }) => void
}

interface ClientToServerEvents {
  'room:join': (p: { roomId: string; name?: string }) => void
  'chat:send': (p: { body: string }) => void
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/* ---------- singleton socket ---------- */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket', 'polling'] })
  }
  return socket
}

/* ---------- useRoom hook ---------- */

export interface UseRoom {
  connected: boolean
  you: Identity | null
  participants: Identity[]
  messages: ChatMessage[]
  problem: Problem | null
  round: Round | null
  sendMessage: (body: string) => void
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

  useEffect(() => {
    if (!roomId) return
    const s = getSocket()

    // reset so a room switch doesn't flash the previous room's data
    setMessages([])
    setParticipants([])
    setProblem(null)
    setRound(null)

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

  return { connected, you, participants, messages, problem, round, sendMessage }
}

/* ---------- helpers ---------- */

export function initials(name: string): string {
  const parts = name.split(/[-\s_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

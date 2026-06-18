import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Room, User } from '../types'
import { ROOMS, PROBLEMS } from '../data/dummy'

interface RoomsContextValue {
  rooms: Room[]
  getRoom: (id: string) => Room | undefined
  joinRoom: (roomId: string, user: User) => void
  startRoom: (roomId: string) => void
  finishRoom: (roomId: string) => void
  submitWork: (roomId: string, userId: string) => void
  createRoom: (problemSlug: string, host: User) => Room
  updateProgress: (roomId: string, userId: string, progress: number) => void
  nextRound: (roomId: string) => void
}

const RoomsContext = createContext<RoomsContextValue | null>(null)

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(ROOMS)

  function getRoom(id: string) {
    return rooms.find(r => r.id === id)
  }

  function joinRoom(roomId: string, user: User) {
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room
      const already = room.participants.some(p => p.user.id === user.id)
      if (already || room.participants.length >= room.maxPlayers) return room
      return {
        ...room,
        participants: [...room.participants, { user, joinedAt: new Date(), progress: 0 }],
      }
    }))
  }

  function startRoom(roomId: string) {
    setRooms(prev => prev.map(room =>
      room.id === roomId && room.status === 'waiting'
        ? { ...room, status: 'active', startedAt: new Date() }
        : room
    ))
  }

  function finishRoom(roomId: string) {
    setRooms(prev => prev.map(room =>
      room.id === roomId && room.status === 'active'
        ? { ...room, status: 'finished', finishedAt: new Date() }
        : room
    ))
  }

  function submitWork(roomId: string, userId: string) {
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room
      return {
        ...room,
        participants: room.participants.map(p =>
          p.user.id === userId ? { ...p, submittedAt: new Date() } : p
        ),
      }
    }))
  }

  function updateProgress(roomId: string, userId: string, progress: number) {
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room
      return {
        ...room,
        participants: room.participants.map(p =>
          p.user.id === userId ? { ...p, progress } : p
        ),
      }
    }))
  }

  function nextRound(roomId: string) {
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room
      const otherProblems = PROBLEMS.filter(p => p.id !== room.problem.id)
      const nextProblem = otherProblems[Math.floor(Math.random() * otherProblems.length)] ?? PROBLEMS[0]
      return {
        ...room,
        problem: nextProblem,
        status: 'active',
        startedAt: new Date(),
        finishedAt: undefined,
        participants: room.participants.map(p => ({ ...p, submittedAt: undefined, progress: 0 })),
      }
    }))
  }

  function createRoom(problemSlug: string, host: User): Room {
    const problem = PROBLEMS.find(p => p.slug === problemSlug) ?? PROBLEMS[0]
    const room: Room = {
      id: `room-${Date.now()}`,
      problem,
      host,
      participants: [{ user: host, joinedAt: new Date(), progress: 0 }],
      status: 'waiting',
      durationMinutes: 45,
      maxPlayers: 4,
    }
    setRooms(prev => [...prev, room])
    return room
  }

  return (
    <RoomsContext value={{ rooms, getRoom, joinRoom, startRoom, finishRoom, submitWork, createRoom, updateProgress, nextRound }}>
      {children}
    </RoomsContext>
  )
}

export function useRoomsContext(): RoomsContextValue {
  const ctx = useContext(RoomsContext)
  if (!ctx) throw new Error('useRoomsContext must be used within RoomsProvider')
  return ctx
}

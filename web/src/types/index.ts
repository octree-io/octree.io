export type Difficulty = 'easy' | 'medium' | 'hard'
export type RoomStatus = 'waiting' | 'active' | 'finished'

export interface User {
  id: string
  username: string
  color: string
}

export interface Problem {
  id: string
  slug: string
  title: string
  difficulty: Difficulty
  description: string
  requirements: {
    functional: string[]
    nonFunctional: string[]
  }
  scaleAssumptions: string[]
  tags: string[]
}

export interface Participant {
  user: User
  joinedAt: Date
  submittedAt?: Date
  progress: number // 0–100
}

export interface Room {
  id: string
  problem: Problem
  host: User
  participants: Participant[]
  status: RoomStatus
  durationMinutes: number
  maxPlayers: number
  startedAt?: Date
  finishedAt?: Date
}

export interface Reaction {
  emoji: string
  count: number
  mine?: boolean
}

export interface Message {
  id: string
  channelId: string
  user: User
  text: string
  timestamp: Date
  reactions?: Reaction[]
  codeBlock?: { label: string; code: string }
  threadCount?: number
}

export interface Channel {
  id: string
  name: string
  type: 'channel' | 'dm'
  unreadCount?: number
  mentionCount?: number
}

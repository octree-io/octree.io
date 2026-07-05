import type { Difficulty } from './rooms'

// Lightweight client-side generators for the "auto" buttons in the create-room
// modal. No server round-trip — just pick from curated word lists.

const ADJECTIVES = [
  'Midnight', 'Turbo', 'Silent', 'Cosmic', 'Rapid', 'Neon', 'Quantum', 'Golden',
  'Frosted', 'Electric', 'Crimson', 'Hyper', 'Lunar', 'Velvet', 'Iron', 'Solar',
]

const NOUNS = [
  'Gauntlet', 'Arena', 'Sprint', 'Forge', 'Circuit', 'Clash', 'Lab', 'Dojo',
  'Playground', 'Showdown', 'Grid', 'Ladder', 'Sandbox', 'Rush', 'Duel', 'Nexus',
]

const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'A relaxed warm-up round — great for getting into the flow.',
  medium: 'A balanced challenge to keep everyone on their toes.',
  hard: 'A serious grind for those who want a real fight.',
}

const OPENERS = [
  'Jump in and',
  'Bring your best and',
  'No pressure —',
  'Grab a seat and',
  'Race the clock and',
]

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function randomRoomName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`
}

export function randomRoomDescription(difficulty: Difficulty): string {
  return `${pick(OPENERS)} ${DIFFICULTY_BLURB[difficulty].charAt(0).toLowerCase()}${DIFFICULTY_BLURB[difficulty].slice(1)}`
}

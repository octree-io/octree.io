import type { RoomStatus } from '../types'
import { useRoomsContext } from '../contexts/RoomsContext'

export function useRooms(filter?: RoomStatus | RoomStatus[]) {
  const ctx = useRoomsContext()

  const filtered = filter
    ? ctx.rooms.filter(r =>
        Array.isArray(filter) ? filter.includes(r.status) : r.status === filter
      )
    : ctx.rooms

  const activeCount = ctx.rooms.filter(r => r.status === 'active').length
  const waitingCount = ctx.rooms.filter(r => r.status === 'waiting').length

  return { ...ctx, rooms: filtered, activeCount, waitingCount }
}

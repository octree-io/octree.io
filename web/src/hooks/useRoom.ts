import { useRoomsContext } from '../contexts/RoomsContext'
import { useUser } from '../contexts/UserContext'

export function useRoom(roomId: string) {
  const ctx = useRoomsContext()
  const { user } = useUser()

  const room = ctx.getRoom(roomId)
  const myParticipant = room?.participants.find(p => p.user.id === user.id)
  const peers = room?.participants.filter(p => p.user.id !== user.id) ?? []
  const isHost = room?.host.id === user.id

  function join() {
    ctx.joinRoom(roomId, user)
  }

  function start() {
    ctx.startRoom(roomId)
  }

  function finish() {
    ctx.finishRoom(roomId)
  }

  function submit() {
    ctx.submitWork(roomId, user.id)
  }

  function setProgress(progress: number) {
    ctx.updateProgress(roomId, user.id, progress)
  }

  function nextRound() {
    ctx.nextRound(roomId)
  }

  return { room, myParticipant, peers, isHost, join, start, finish, submit, setProgress, nextRound }
}

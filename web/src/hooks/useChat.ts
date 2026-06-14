import { useState } from 'react'
import { useChatContext } from '../contexts/ChatContext'
import { useUser } from '../contexts/UserContext'

export function useChat(channelId: string) {
  const { messages, sendMessage, addReaction } = useChatContext()
  const { user } = useUser()
  const [draft, setDraft] = useState('')

  const channelMessages = messages.filter(m => m.channelId === channelId)

  function send() {
    sendMessage(channelId, user, draft)
    setDraft('')
  }

  function react(messageId: string, emoji: string) {
    addReaction(messageId, emoji, user.id)
  }

  return { messages: channelMessages, draft, setDraft, send, react }
}

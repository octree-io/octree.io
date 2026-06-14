import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Message, User } from '../types'
import { MESSAGES } from '../data/dummy'

interface ChatContextValue {
  messages: Message[]
  sendMessage: (channelId: string, user: User, text: string) => void
  addReaction: (messageId: string, emoji: string, userId: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(MESSAGES)

  function sendMessage(channelId: string, user: User, text: string) {
    if (!text.trim()) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      channelId,
      user,
      text: text.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, msg])
  }

  function addReaction(messageId: string, emoji: string, userId: string) {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg
      const reactions = msg.reactions ?? []
      const existing = reactions.find(r => r.emoji === emoji)
      if (existing) {
        return {
          ...msg,
          reactions: reactions.map(r =>
            r.emoji === emoji
              ? { ...r, count: r.mine ? r.count - 1 : r.count + 1, mine: !r.mine }
              : r
          ).filter(r => r.count > 0),
        }
      }
      return {
        ...msg,
        reactions: [...reactions, { emoji, count: 1, mine: userId === 'u-you' }],
      }
    }))
  }

  return (
    <ChatContext value={{ messages, sendMessage, addReaction }}>
      {children}
    </ChatContext>
  )
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { CURRENT_USER } from '../data/dummy'

interface UserContextValue {
  user: User
  updateUser: (patch: Partial<User>) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(CURRENT_USER)

  function updateUser(patch: Partial<User>) {
    setUser(prev => ({ ...prev, ...patch }))
  }

  return (
    <UserContext value={{ user, updateUser }}>
      {children}
    </UserContext>
  )
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}

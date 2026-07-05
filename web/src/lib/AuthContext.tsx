import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as auth from './auth'
import type { AuthUser } from './auth'
import { refreshSocketIdentity } from './socket'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (body: { username: string; email: string; password: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  updateProfile: (body: { username: string }) => Promise<AuthUser>
  refresh: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setUser(await auth.fetchMe())
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login({ email, password })
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (body: { username: string; email: string; password: string }) => {
    const u = await auth.register(body)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (body: { username: string }) => {
    const u = await auth.updateProfile(body)
    setUser(u)
    // Reconnect the realtime socket so it re-reads the new username; the Lobby
    // then shows the updated identity as soon as you return to it.
    refreshSocketIdentity()
    return u
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, updateProfile, refresh }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

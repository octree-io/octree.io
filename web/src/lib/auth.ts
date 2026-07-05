import { API_URL } from './socket'

export interface AuthUser {
  id: number
  username: string
  email: string
  avatarUrl: string | null
  createdAt: string
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const BASE = `${API_URL}/api/auth`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new AuthError(res.status, (data && data.error) || 'Something went wrong')
  }
  return data as T
}

export function register(body: {
  username: string
  email: string
  password: string
}): Promise<AuthUser> {
  return request<AuthUser>('/register', { method: 'POST', body: JSON.stringify(body) })
}

export function login(body: { email: string; password: string }): Promise<AuthUser> {
  return request<AuthUser>('/login', { method: 'POST', body: JSON.stringify(body) })
}

export function logout(): Promise<null> {
  return request<null>('/logout', { method: 'POST' })
}

/** Update the signed-in user's profile (currently just the username). */
export function updateProfile(body: { username: string }): Promise<AuthUser> {
  return request<AuthUser>('/me', { method: 'PATCH', body: JSON.stringify(body) })
}

/** Current user, or null if not signed in. */
export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/me`, { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new AuthError(res.status, 'Failed to load session')
  return res.json()
}

/** Full URL to kick off the server-side Google OAuth flow. */
export function googleAuthUrl(): string {
  return `${BASE}/google`
}

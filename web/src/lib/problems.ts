import { API_URL } from './socket'

export interface ProblemDetail {
  id: number
  slug: string
  title: string
  description: string // HTML
  difficulty: 'easy' | 'medium' | 'hard'
  // Per-language starter code, keyed by language slug (python3 / cpp / java / javascript).
  starterCode: Record<string, string> | null
}

/** Fetch a problem's name + description (never the solution) by slug. */
export async function fetchProblem(slug: string): Promise<ProblemDetail> {
  const res = await fetch(`${API_URL}/api/problems/${encodeURIComponent(slug)}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to load problem')
  return res.json()
}

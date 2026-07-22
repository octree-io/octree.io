import { API_URL } from './socket'

// Editor language key -> Judge0 language id (must match the worker harness).
export const LANGUAGE_IDS = {
  python: 71, // Python 3.8
  javascript: 63, // Node.js 12
  java: 62, // Java 13
  cpp: 54, // C++ (GCC 9.2)
} as const

export type SubmissionLang = keyof typeof LANGUAGE_IDS

export interface CaseResult {
  ordinal: number
  input: string
  expected: string
  got: string
  passed: boolean
  runtimeMs: number
  error: string | null
  stdout: string
}

export type SubmissionStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface Submission {
  id: number
  status: SubmissionStatus
  mode: 'run' | 'submit' | null
  results: CaseResult[] | null
  testsPassed: number | null
  testsTotal: number | null
  error: string | null
  compileOutput: string | null
  stderr: string | null
  judge0StatusDescription: string | null
}

export interface RunParams {
  problemId: number
  lang: SubmissionLang
  sourceCode: string
  mode: 'run' | 'submit'
  roomId?: number
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.error ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export async function getSubmission(id: number): Promise<Submission> {
  const res = await fetch(`${API_URL}/api/submissions/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load submission (${res.status})`)
  return res.json()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Create a graded submission and poll until it reaches a terminal state.
 * Resolves with the completed/failed submission row (results included).
 */
export async function runSolution(
  { problemId, lang, sourceCode, mode, roomId }: RunParams,
  { intervalMs = 700, timeoutMs = 40_000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<Submission> {
  const { id } = await post<{ id: number; status: SubmissionStatus }>('submissions', {
    problemId,
    languageId: LANGUAGE_IDS[lang],
    sourceCode,
    mode,
    roomId,
  })

  const deadline = Date.now() + timeoutMs
  for (;;) {
    await sleep(intervalMs)
    const sub = await getSubmission(id)
    if (sub.status === 'completed' || sub.status === 'failed') return sub
    if (Date.now() > deadline) throw new Error('Timed out waiting for results')
  }
}

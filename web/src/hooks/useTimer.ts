import { useState, useEffect } from 'react'

interface TimerResult {
  remaining: number   // seconds
  formatted: string  // mm:ss
  pct: number        // 0–100 (time elapsed)
  expired: boolean
}

export function useTimer(startedAt: Date | undefined, durationMinutes: number): TimerResult {
  const totalSeconds = durationMinutes * 60

  function calc(): TimerResult {
    if (!startedAt) {
      return { remaining: totalSeconds, formatted: fmt(totalSeconds), pct: 0, expired: false }
    }
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    const remaining = Math.max(0, totalSeconds - elapsed)
    return {
      remaining,
      formatted: fmt(remaining),
      pct: Math.min(100, (elapsed / totalSeconds) * 100),
      expired: remaining === 0,
    }
  }

  const [result, setResult] = useState<TimerResult>(calc)

  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setResult(calc()), 1000)
    return () => clearInterval(id)
  }, [startedAt, totalSeconds])

  return result
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

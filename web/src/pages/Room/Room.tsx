import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Editor, { type Monaco } from '@monaco-editor/react'
import { BrandLink } from '../../components/Logo'
import {
  SendIcon, PlayIcon, UploadIcon, LeaveIcon,
  CheckIcon, XIcon, PlusIcon,
} from '../../components/Icons'
import { useRoom, initials as toInitials, sameGroup, type ChatMessage } from '../../lib/socket'
import { fetchProblem, type ProblemDetail } from '../../lib/problems'
import { runSolution, type Submission } from '../../lib/submissions'
import './Room.css'

/* ---------- types ---------- */

type Lang = 'python' | 'java' | 'cpp' | 'javascript'

interface TestResult {
  index: number
  input: string
  expected: string
  got: string
  passed: boolean
  runtimeMs: number
  stdout: string
  error: string | null
}

// Custom test cases have no known expected output — "passed" here just means
// "ran without error", and the actual output is always shown (there's nothing
// hidden to protect: the user chose these inputs themselves).
interface CustomCaseResult {
  id: string
  input: string
  ok: boolean
  got: string
  runtimeMs: number
  stdout: string
  error: string | null
}

/* ---------- constants ---------- */

const TOTAL_SECS = 30 * 60
const ME_ID = 'you'

const LANG_LABELS: Record<Lang, string> = {
  python: 'Python 3', java: 'Java', cpp: 'C++20', javascript: 'JavaScript',
}

const MONACO_LANG: Record<Lang, string> = {
  python: 'python', java: 'java', cpp: 'cpp', javascript: 'javascript',
}

// Maps the client's Lang key to the language slug used in problems.starter_code.
const STARTER_CODE_LANG: Record<Lang, string> = {
  python: 'python3', java: 'java', cpp: 'cpp', javascript: 'javascript',
}

// Fallback stub, used only when a problem has no starter code for a language
// (e.g. not seeded yet) — deliberately blank rather than a worked example, so
// it never gives away a solution.
const FALLBACK_STARTER: Record<Lang, string> = {
  python: `class Solution:\n    def solve(self):\n        # write your solution here\n        pass\n`,
  java: `class Solution {\n    // write your solution here\n}\n`,
  cpp: `class Solution {\npublic:\n    // write your solution here\n};\n`,
  javascript: `// write your solution here\n`,
}

function starterCodeFor(problem: ProblemDetail | null): Record<Lang, string> {
  const sc = problem?.starterCode
  return {
    python: sc?.[STARTER_CODE_LANG.python] ?? FALLBACK_STARTER.python,
    java: sc?.[STARTER_CODE_LANG.java] ?? FALLBACK_STARTER.java,
    cpp: sc?.[STARTER_CODE_LANG.cpp] ?? FALLBACK_STARTER.cpp,
    javascript: sc?.[STARTER_CODE_LANG.javascript] ?? FALLBACK_STARTER.javascript,
  }
}

/* ---------- monaco theme ---------- */

function setupTheme(monaco: Monaco) {
  // the JS/TS language service second-guesses valid JS (and anything
  // mis-tokenized as JS) with bogus syntax/semantic errors — this is just
  // an editor for arbitrary solutions, not a real project, so turn it off.
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  })
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  })

  monaco.editor.defineTheme('octree', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',           foreground: 'a78bfa' },
      { token: 'keyword.control',   foreground: 'a78bfa' },
      { token: 'storage.type',      foreground: 'a78bfa' },
      { token: 'type',              foreground: '60a5fa' },
      { token: 'type.identifier',   foreground: '60a5fa' },
      { token: 'entity.name.type',  foreground: '60a5fa' },
      { token: 'string',            foreground: 'a3e635' },
      { token: 'number',            foreground: 'fbbf24' },
      { token: 'comment',           foreground: '6b7280', fontStyle: 'italic' },
      { token: 'delimiter',         foreground: 'e2e2f0' },
      { token: 'variable',          foreground: 'e2e2f0' },
    ],
    colors: {
      'editor.background':                  '#0f0f14',
      'editor.foreground':                  '#e2e2f0',
      'editorLineNumber.foreground':        '#2a2a3d',
      'editorLineNumber.activeForeground':  '#7b7b9a',
      'editor.selectionBackground':         '#a78bfa33',
      'editor.lineHighlightBackground':     '#16161f',
      'editorCursor.foreground':            '#a78bfa',
      'editor.inactiveSelectionBackground': '#a78bfa1a',
      'editorIndentGuide.background1':      '#2a2a3d',
      'editorIndentGuide.activeBackground1':'#3a3a5c',
      'scrollbarSlider.background':         '#2a2a3d80',
      'scrollbarSlider.hoverBackground':    '#3a3a5c',
      'editorWidget.background':            '#16161f',
      'editorSuggestWidget.background':     '#16161f',
      'editorSuggestWidget.border':         '#2a2a3d',
      'editorSuggestWidget.selectedBackground': '#232336',
    },
  })
}

/* ---------- sub-components ---------- */

function Avatar({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

function LangSelect({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`lang-select${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="lang-select-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{LANG_LABELS[value]}</span>
        <svg className="lang-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox">
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <li key={l} role="option" aria-selected={l === value}>
              <button
                type="button"
                className={`lang-option${l === value ? ' selected' : ''}`}
                onClick={() => { onChange(l); setOpen(false) }}
              >
                {LANG_LABELS[l]}
                {l === value && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- main ---------- */

export default function Room() {
  /* panel widths */
  const [leftW,  setLeftW]  = useState(300)
  const [rightW, setRightW] = useState(268)
  const drag = useRef<{ side: 'left' | 'right'; lastX: number } | null>(null)

  /* editor — one code buffer per language, so switching langs preserves progress */
  const [lang, setLang] = useState<Lang>('python')
  const [codeByLang, setCodeByLang] = useState<Record<Lang, string>>(FALLBACK_STARTER)
  const myCode = codeByLang[lang]

  /* room */
  const { id: roomId } = useParams<{ id: string }>()
  const [timeLeft,      setTimeLeft]      = useState(TOTAL_SECS)
  const [chatInput,     setChatInput]     = useState('')
  const [runLoading,    setRunLoading]    = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [results,       setResults]       = useState<TestResult[] | null>(null)
  // "run" only samples a few cases and is meant for debugging, so its
  // expected/actual output is shown; "submit" grades the full hidden suite, so
  // that detail is withheld (the API itself redacts it — this just decides
  // whether the UI attempts to render it).
  const [resultsMode,   setResultsMode]   = useState<'run' | 'submit' | null>(null)
  const [expandedCase,  setExpandedCase]  = useState<number | null>(null)
  const [runError,      setRunError]      = useState<string | null>(null)
  const [submitted,     setSubmitted]     = useState(false)
  const [tsTooltip,     setTsTooltip]     = useState<{ text: string; x: number; y: number } | null>(null)

  /* console tabs: the graded run/submit output, or the custom-test-case builder */
  const [consoleTab, setConsoleTab] = useState<'console' | 'custom'>('console')

  /* custom test cases — ad-hoc inputs the user builds per-parameter and runs
     against their current code. Never graded (no known expected output). */
  const [customCases,   setCustomCases]   = useState<{ id: string; values: string[] }[]>([])
  const [customResults, setCustomResults] = useState<CustomCaseResult[] | null>(null)
  const [customLoading, setCustomLoading] = useState(false)
  const [customError,   setCustomError]   = useState<string | null>(null)
  const [expandedCustom, setExpandedCustom] = useState<string | null>(null)

  // realtime: anonymous presence + chat, plus the live problem & round timer
  const {
    messages,
    participants: liveParticipants,
    you,
    problem: liveProblem,
    round,
    connected,
    sendMessage: sendChat,
    youAreHost,
    closeRoom,
    closed,
  } = useRoom(roomId)

  const navigate = useNavigate()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Pull the problem's name + description from the API (keyed by the slug the
  // round assigns over the socket). Kept separate from the socket payload so the
  // full HTML description is fetched on demand.
  const [problemDetail, setProblemDetail] = useState<ProblemDetail | null>(null)
  useEffect(() => {
    const slug = liveProblem?.slug
    if (!slug) { setProblemDetail(null); return }
    let alive = true
    fetchProblem(slug)
      .then((d) => { if (alive) setProblemDetail(d) })
      .catch(() => { if (alive) setProblemDetail(null) })
    return () => { alive = false }
  }, [liveProblem?.slug])

  // Seed each language's editor buffer with this problem's starter code
  // whenever the round assigns a new problem.
  useEffect(() => {
    setCodeByLang(starterCodeFor(problemDetail))
  }, [problemDetail])

  const paramNames = problemDetail?.paramNames ?? []

  // A new problem means old custom test cases don't apply anymore.
  useEffect(() => {
    setCustomCases([])
    setCustomResults(null)
    setCustomError(null)
    setExpandedCustom(null)
  }, [problemDetail?.id])

  // The room was closed (host action, or auto-closed when empty) — leave.
  useEffect(() => {
    if (closed) navigate('/lobby', { replace: true })
  }, [closed, navigate])

  function handleCloseRoom() {
    if (window.confirm('Close this room for everyone? This ends the session.')) {
      closeRoom()
    }
  }

  /* resize — global listeners added once */
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current) return
      const dx = e.clientX - drag.current.lastX
      drag.current.lastX = e.clientX
      if (drag.current.side === 'left') {
        setLeftW(w => Math.max(220, Math.min(520, w + dx)))
      } else {
        setRightW(w => Math.max(200, Math.min(440, w - dx)))
      }
    }
    function onUp() {
      drag.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  function startDrag(side: 'left' | 'right', e: React.MouseEvent) {
    e.preventDefault()
    drag.current = { side, lastX: e.clientX }
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  /* timer — driven by the server's round deadline when connected, otherwise a
     local countdown so the room still feels alive offline. */
  useEffect(() => {
    function tick() {
      if (round?.endsAt) {
        const rem = Math.round((new Date(round.endsAt).getTime() - Date.now()) / 1000)
        setTimeLeft(Math.max(0, rem))
      } else {
        setTimeLeft(s => Math.max(0, s - 1))
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [round?.endsAt])

  /* a new round means a fresh problem — clear stale run results */
  useEffect(() => {
    setResults(null)
    setResultsMode(null)
    setExpandedCase(null)
    setRunError(null)
    setSubmitted(false)
  }, [round?.number])

  /* scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function fmtTime(s: number) {
    const m   = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function timerClass() {
    if (timeLeft > 10 * 60) return 'timer-green'
    if (timeLeft > 5  * 60) return 'timer-yellow'
    return 'timer-red'
  }

  function switchLang(l: Lang) {
    setLang(l)
    setResults(null)
    setResultsMode(null)
    setExpandedCase(null)
    setRunError(null)
    // custom test case *definitions* are language-independent; only their
    // last run's results (which were produced by the previous language) go stale.
    setCustomResults(null)
    setCustomError(null)
    setExpandedCustom(null)
  }

  function updateMyCode(v: string) {
    setCodeByLang(prev => ({ ...prev, [lang]: v }))
  }

  // Map a completed submission into the console's per-case view. A build/compile
  // error (no case produced output) is surfaced as a single error banner.
  function applySubmission(sub: Submission): boolean {
    const cases = sub.results ?? []
    const ranAnyCase = cases.some(r => r.error === null || r.got !== '')
    if (sub.status === 'failed' || (sub.error && !ranAnyCase)) {
      setResults(null)
      setRunError(sub.error ?? sub.judge0StatusDescription ?? 'Execution failed')
      return false
    }
    setRunError(null)
    setExpandedCase(null)
    setResults(cases.map((r, i) => ({
      index: i + 1,
      input: r.input,
      expected: r.expected,
      got: r.got,
      passed: r.passed,
      runtimeMs: Math.round(r.runtimeMs),
      stdout: r.stdout,
      error: r.error,
    })))
    return cases.length > 0 && cases.every(r => r.passed)
  }

  async function grade(mode: 'run' | 'submit') {
    const problemId = liveProblem?.id
    if (!problemId) {
      setRunError('No active problem to run against yet.')
      setResults(null)
      return
    }
    const setLoading = mode === 'run' ? setRunLoading : setSubmitLoading
    setLoading(true)
    setResults(null)
    setResultsMode(mode)
    setRunError(null)
    try {
      const sub = await runSolution({ problemId, lang, sourceCode: myCode, mode })
      const allPassed = applySubmission(sub)
      if (mode === 'submit' && allPassed) setSubmitted(true)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleRun = () => grade('run')
  const handleSubmit = () => grade('submit')

  function addCustomCase() {
    setCustomCases(cs => [...cs, { id: crypto.randomUUID(), values: paramNames.map(() => '') }])
  }

  function removeCustomCase(id: string) {
    setCustomCases(cs => cs.filter(c => c.id !== id))
    setExpandedCustom(e => (e === id ? null : e))
  }

  function updateCustomValue(id: string, i: number, value: string) {
    setCustomCases(cs => cs.map(c => (c.id === id ? { ...c, values: c.values.map((v, j) => (j === i ? value : v)) } : c)))
  }

  async function runCustomTests() {
    const problemId = liveProblem?.id
    if (!problemId) {
      setCustomError('No active problem to run against yet.')
      return
    }
    if (customCases.length === 0) {
      setCustomError('Add at least one test case first.')
      return
    }
    setCustomLoading(true)
    setCustomError(null)
    setExpandedCustom(null)
    try {
      // Build "name = literal, name2 = literal2" strings — the same
      // Python-literal-style format the stored test cases already use, so it
      // reuses the harness's existing input parser unchanged.
      const inputs = customCases.map(c =>
        paramNames.map((name, i) => `${name} = ${c.values[i]?.trim() || 'None'}`).join(', '),
      )
      const sub = await runSolution({ problemId, lang, sourceCode: myCode, mode: 'custom', customInputs: inputs })
      if (sub.status === 'failed' && !sub.results?.length) {
        setCustomResults(null)
        setCustomError(sub.error ?? sub.judge0StatusDescription ?? 'Execution failed')
        return
      }
      setCustomResults((sub.results ?? []).map((r, i) => ({
        id: customCases[i]?.id ?? String(i),
        input: r.input,
        ok: r.passed,
        got: r.got,
        runtimeMs: Math.round(r.runtimeMs),
        stdout: r.stdout,
        error: r.error,
      })))
    } catch (err) {
      setCustomResults(null)
      setCustomError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setCustomLoading(false)
    }
  }

  function sendMessage() {
    const text = chatInput.trim()
    if (!text) return
    sendChat(text)
    setChatInput('')
  }

  function fmtStamp(iso: string) {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const passedCount       = results?.filter(r => r.passed).length ?? 0
  const totalCount        = results?.length ?? 0
  const allPassed         = results !== null && passedCount === totalCount

  // "in the room" roster: real socket presence when connected, else fallback to you.
  const roster =
    liveParticipants.length > 0
      ? liveParticipants.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          initials: toInitials(p.name),
          isYou: !!you && p.id === you.id,
        }))
      : [{
          id: ME_ID,
          name: you?.name ?? 'you',
          color: '#3b6fb0',
          initials: 'RØ',
          isYou: true,
        }]

  const difficultyChip = liveProblem
    ? `chip-${liveProblem.difficulty}`
    : 'chip-easy'

  const phase = round?.phase ?? 'solving'

  return (
    <div className="room">

      {/* ── TOPBAR ── */}
      <header className="room-topbar">
        <div className="topbar-left">
          <BrandLink to="/" size={20} />
          <span className="topbar-sep" aria-hidden="true" />
        </div>

        <div className="room-timer-wrap">
          <span className={`room-phase room-phase-${phase}`}>
            {phase === 'review' ? 'Review' : 'Solving'}
          </span>
          <div className={`room-timer ${timerClass()}`}>{fmtTime(timeLeft)}</div>
        </div>

        <div className="topbar-right">
          {youAreHost && (
            <button type="button" className="btn-close-room" onClick={handleCloseRoom}>
              <XIcon />
              Close room
            </button>
          )}
          <Link to="/" className="btn-leave">
            <LeaveIcon />
            Leave
          </Link>
        </div>
      </header>

      {/* ── BODY ── */}
      <div
        className="room-body"
        style={{ gridTemplateColumns: `${leftW}px 4px 1fr 4px ${rightW}px` }}
      >

        {/* ── PROBLEM PANEL ── */}
        <aside className="room-problem">
          {liveProblem ? (
            <>
              <div className="problem-header">
                <h2 className="problem-title">{problemDetail?.title ?? liveProblem.title}</h2>
                <span className={`chip ${difficultyChip}`}>
                  {liveProblem.difficulty[0].toUpperCase() + liveProblem.difficulty.slice(1)}
                </span>
              </div>
              {/* Imported descriptions are HTML — render them as markup. */}
              <div
                className="problem-content problem-html"
                dangerouslySetInnerHTML={{ __html: problemDetail?.description ?? liveProblem.description }}
              />
            </>
          ) : (
          <>
          <div className="problem-header">
            <h2 className="problem-title">Two Sum</h2>
            <span className="chip chip-easy">Easy</span>
          </div>
          <div className="problem-content">
            <p>
              Given an array of integers <code>nums</code> and an integer <code>target</code>,
              return <em>indices of the two numbers such that they add up to <code>target</code></em>.
            </p>
            <p>
              You may assume that each input would have <strong>exactly one solution</strong>,
              and you may not use the same element twice.
              You can return the answer in any order.
            </p>

            <h3 className="problem-section">Examples</h3>
            <div className="example-block">
              <div><span className="ex-label">Input</span><code>nums = [2,7,11,15], target = 9</code></div>
              <div><span className="ex-label">Output</span><code>[0,1]</code></div>
              <div><span className="ex-label">Why</span><code>nums[0] + nums[1] == 9</code></div>
            </div>
            <div className="example-block">
              <div><span className="ex-label">Input</span><code>nums = [3,2,4], target = 6</code></div>
              <div><span className="ex-label">Output</span><code>[1,2]</code></div>
            </div>
            <div className="example-block">
              <div><span className="ex-label">Input</span><code>nums = [3,3], target = 6</code></div>
              <div><span className="ex-label">Output</span><code>[0,1]</code></div>
            </div>

            <h3 className="problem-section">Constraints</h3>
            <ul className="constraints">
              <li><code>2 ≤ nums.length ≤ 10⁴</code></li>
              <li><code>-10⁹ ≤ nums[i] ≤ 10⁹</code></li>
              <li><code>-10⁹ ≤ target ≤ 10⁹</code></li>
              <li>Only one valid answer exists.</li>
            </ul>
          </div>
          </>
          )}
        </aside>

        {/* ── LEFT RESIZE HANDLE ── */}
        <div className="resize-handle" onMouseDown={e => startDrag('left', e)} />

        {/* ── EDITOR PANEL ── */}
        <div className="room-editor">

          {/* participant tabs + language selector */}
          <div className="participant-tabs">
            <div className="ptab-list">
              <button className="ptab ptab-mine ptab-active">
                <Avatar initials="RØ" color="#3b6fb0" size={20} />
                <span className="ptab-name">{you?.name ?? 'you'}</span>
                <span className="ptab-you-dot" />
              </button>
            </div>

            <div className="ptab-lang">
              <LangSelect value={lang} onChange={switchLang} />
            </div>
          </div>

          {/* editor body */}
          <div className="editor-body">
            <Editor
              language={MONACO_LANG[lang]}
              value={myCode}
              onChange={v => updateMyCode(v ?? '')}
              theme="octree"
              beforeMount={setupTheme}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                padding: { top: 14, bottom: 14 },
                wordWrap: 'off',
                tabSize: 4,
                renderWhitespace: 'selection',
                smoothScrolling: true,
                cursorBlinking: 'phase',
                cursorSmoothCaretAnimation: 'on',
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                // Don't pop up suggestions just from typing — only when the
                // user explicitly asks for them (Ctrl+Space).
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: 'off',
                wordBasedSuggestions: 'off',
                parameterHints: { enabled: false },
                tabCompletion: 'off',
              }}
            />
          </div>

          {/* run panel — always visible; hosts run/submit and their output */}
          <div className="run-panel">
            <div className="run-panel-header">
              <div className="run-panel-tabs">
                <button
                  type="button"
                  className={`run-panel-tab${consoleTab === 'console' ? ' active' : ''}`}
                  onClick={() => setConsoleTab('console')}
                >
                  Console
                </button>
                <button
                  type="button"
                  className={`run-panel-tab${consoleTab === 'custom' ? ' active' : ''}`}
                  onClick={() => setConsoleTab('custom')}
                >
                  Custom Tests
                </button>
              </div>
              {consoleTab === 'console' && submitted && <span className="submit-badge">✓ submitted</span>}
              {consoleTab === 'console' ? (
                <div className="run-panel-actions">
                  <button className="btn-run" onClick={handleRun} disabled={runLoading || submitLoading}>
                    <PlayIcon />{runLoading ? 'Running…' : 'Run'}
                  </button>
                  <button
                    className="btn-submit-code btn-primary"
                    onClick={handleSubmit}
                    disabled={runLoading || submitLoading || submitted}
                  >
                    <UploadIcon />{submitLoading ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              ) : (
                <div className="run-panel-actions">
                  <button type="button" className="btn-run" onClick={addCustomCase} disabled={paramNames.length === 0}>
                    <PlusIcon />Add case
                  </button>
                  <button
                    type="button"
                    className="btn-submit-code btn-primary"
                    onClick={runCustomTests}
                    disabled={customLoading || customCases.length === 0}
                  >
                    <PlayIcon />{customLoading ? 'Running…' : 'Run custom tests'}
                  </button>
                </div>
              )}
            </div>

            <div className="run-panel-body">
              {consoleTab === 'custom' ? (
                customLoading ? (
                  <div className="run-panel-empty">Running custom tests…</div>
                ) : paramNames.length === 0 ? (
                  <div className="run-panel-empty">
                    This problem's parameters couldn't be detected — custom tests aren't available.
                  </div>
                ) : (
                  <>
                    <div className="custom-cases">
                      {customCases.length === 0 && (
                        <div className="run-panel-empty">Add a test case to try your code against custom inputs.</div>
                      )}
                      {customCases.map((c, idx) => {
                        const result = customResults?.find(r => r.id === c.id)
                        const isOpen = expandedCustom === c.id
                        return (
                          <div key={c.id} className="custom-case">
                            <div className="custom-case-row">
                              <span className="custom-case-index">#{idx + 1}</span>
                              <div className="custom-case-fields">
                                {paramNames.map((name, i) => (
                                  <label key={name} className="custom-case-field">
                                    <span className="custom-case-label">{name}</span>
                                    <input
                                      className="custom-case-input"
                                      value={c.values[i] ?? ''}
                                      onChange={e => updateCustomValue(c.id, i, e.target.value)}
                                      placeholder="e.g. [1,2,3]"
                                      spellCheck={false}
                                    />
                                  </label>
                                ))}
                              </div>
                              <button
                                type="button"
                                className="custom-case-remove"
                                onClick={() => removeCustomCase(c.id)}
                                aria-label="Remove test case"
                              >
                                <XIcon />
                              </button>
                            </div>
                            {result && (
                              <>
                                <button
                                  type="button"
                                  className={`custom-case-result${result.ok ? ' ok' : ' err'}`}
                                  onClick={() => setExpandedCustom(isOpen ? null : c.id)}
                                  aria-expanded={isOpen}
                                >
                                  <span className="result-icon">{result.ok ? <CheckIcon /> : <XIcon />}</span>
                                  <span className="result-input">
                                    {result.ok ? <>output: <code>{result.got}</code></> : 'runtime error'}
                                  </span>
                                  <span className="result-ms">{result.runtimeMs}ms</span>
                                  <svg className="result-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>
                                {isOpen && (
                                  <div className="result-stdout">
                                    {result.error && (
                                      <>
                                        <div className="result-stdout-label result-error-label">error</div>
                                        <pre className="result-error-pre">{result.error}</pre>
                                      </>
                                    )}
                                    {result.stdout && (
                                      <>
                                        {result.error && <div className="result-stdout-label">stdout</div>}
                                        <pre>{result.stdout}</pre>
                                      </>
                                    )}
                                    {!result.error && !result.stdout && (
                                      <span className="result-stdout-empty">No output printed</span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {customError && (
                      <div className="run-panel-error">
                        <div className="run-error-title">Couldn’t run your code</div>
                        <pre className="run-error-body">{customError}</pre>
                      </div>
                    )}
                  </>
                )
              ) : runLoading || submitLoading ? (
                <div className="run-panel-empty">{submitLoading ? 'Submitting…' : 'Running against test cases…'}</div>
              ) : runError ? (
                <div className="run-panel-error">
                  <div className="run-error-title">Couldn’t run your code</div>
                  <pre className="run-error-body">{runError}</pre>
                </div>
              ) : results ? (
                <>
                  <div className="results-header">
                    <span className={allPassed ? 'results-pass' : 'results-fail'}>
                      {allPassed ? '✓' : '✗'} {passedCount} / {totalCount} tests passed
                    </span>
                    <span className="results-runtime">
                      avg {Math.round(results.reduce((a, r) => a + r.runtimeMs, 0) / results.length)} ms
                    </span>
                  </div>
                  <div className="results-cases">
                    {results.map(r => {
                      // Expanding to see stdout is a debugging aid for "run" only —
                      // "submit" grades the hidden suite and must show nothing
                      // beyond input/pass-fail/runtime, with no expand affordance.
                      const expandable = resultsMode === 'run'
                      const isOpen = expandable && expandedCase === r.index
                      const rowContent = (
                        <>
                          <span className="result-icon">{r.passed ? <CheckIcon /> : <XIcon />}</span>
                          <span className="result-label">Case {r.index}</span>
                          <span className="result-input">{r.input}</span>
                          {!r.passed && !r.error && resultsMode === 'run' && (
                            <span className="result-diff">
                              expected <code>{r.expected}</code> got <code>{r.got}</code>
                            </span>
                          )}
                          {!r.passed && r.error && (
                            <span className="result-error-tag">
                              {expandable ? 'error — click to expand' : 'error'}
                            </span>
                          )}
                          <span className="result-ms">{r.runtimeMs}ms</span>
                          {expandable && (
                            <svg className="result-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          )}
                        </>
                      )
                      return (
                        <div key={r.index} className={`result-case-wrap${isOpen ? ' expanded' : ''}`}>
                          {expandable ? (
                            <button
                              type="button"
                              className={`result-case${r.passed ? ' result-pass' : ' result-fail'}`}
                              onClick={() => setExpandedCase(isOpen ? null : r.index)}
                              aria-expanded={isOpen}
                            >
                              {rowContent}
                            </button>
                          ) : (
                            <div className={`result-case${r.passed ? ' result-pass' : ' result-fail'}`}>
                              {rowContent}
                            </div>
                          )}
                          {isOpen && (
                            <div className="result-stdout">
                              {r.error && (
                                <>
                                  <div className="result-stdout-label result-error-label">error</div>
                                  <pre className="result-error-pre">{r.error}</pre>
                                </>
                              )}
                              {r.stdout && (
                                <>
                                  {r.error && <div className="result-stdout-label">stdout</div>}
                                  <pre>{r.stdout}</pre>
                                </>
                              )}
                              {!r.error && !r.stdout && (
                                <span className="result-stdout-empty">No output printed</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="run-panel-empty">Run your code to see test results here.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT RESIZE HANDLE ── */}
        <div className="resize-handle" onMouseDown={e => startDrag('right', e)} />

        {/* ── SIDEBAR ── */}
        <aside className="room-sidebar">
          <div className="sidebar-section sidebar-participants">
            <div className="sidebar-label">in the room · {roster.length}</div>
            <ul className="participants-list">
              {roster.map(p => (
                <li key={p.id} className={`participant-row${p.isYou ? ' participant-you' : ''}`}>
                  <Avatar initials={p.initials} color={p.color} size={26} />
                  <span className="participant-name">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section sidebar-chat">
            <div className="sidebar-label">chat</div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">{connected ? 'No messages yet — say hi 👋' : 'Connecting…'}</div>
              )}
              {messages.map((m: ChatMessage, i) => {
                const prev = messages[i - 1]
                const grouped = sameGroup(prev, m)
                const showTsTooltip = (e: React.MouseEvent<HTMLElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTsTooltip({
                    text: new Date(m.createdAt).toLocaleString('en-US', { hour12: true }),
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  })
                }
                return (
                  <div key={m.id} className={`chat-msg${grouped ? ' grouped' : ''}`}>
                    <div className="chat-msg-gutter">
                      {grouped
                        ? <span
                            className="chat-msg-hovertime"
                            onMouseEnter={showTsTooltip}
                            onMouseLeave={() => setTsTooltip(null)}
                          >
                            {fmtStamp(m.createdAt)}
                          </span>
                        : <Avatar initials={toInitials(m.authorName)} color={m.authorColor} size={36} />}
                    </div>
                    <div className="chat-msg-body">
                      {!grouped && (
                        <div className="chat-msg-head">
                          <span className="chat-author" style={{ color: m.authorColor }}>
                            {m.authorName}
                          </span>
                          <span
                            className="chat-ts"
                            onMouseEnter={showTsTooltip}
                            onMouseLeave={() => setTsTooltip(null)}
                          >
                            {fmtStamp(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <span className="chat-text">{m.body}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={e => { e.preventDefault(); sendMessage() }}>
              <input
                className="chat-input"
                placeholder={connected ? 'message…' : 'connecting…'}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="chat-send" aria-label="Send">
                <SendIcon />
              </button>
            </form>
          </div>
        </aside>
      </div>

      {tsTooltip && createPortal(
        <div className="ts-tooltip" style={{ left: tsTooltip.x, top: tsTooltip.y }}>
          {tsTooltip.text}
        </div>,
        document.body,
      )}
    </div>
  )
}

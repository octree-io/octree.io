import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Editor, { type Monaco } from '@monaco-editor/react'
import { BrandLink } from '../../components/Logo'
import {
  SendIcon, PlayIcon, UploadIcon, LeaveIcon,
  CheckIcon, XIcon, LockIcon,
} from '../../components/Icons'
import { useRoom, initials as toInitials } from '../../lib/socket'
import './Room.css'

/* ---------- types ---------- */

type Lang = 'python' | 'java' | 'cpp' | 'javascript'

interface OtherParticipant {
  id: string
  name: string
  color: string
  initials: string
  status: 'online' | 'typing' | 'submitted'
  lang: Lang
  code: string
}

interface TestResult {
  index: number
  input: string
  expected: string
  got: string
  passed: boolean
  runtimeMs: number
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

const STARTER: Record<Lang, string> = {
  python: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
        return []
`,
  java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        var map = new java.util.HashMap<Integer, Integer>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) return new int[]{ map.get(comp), i };
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}
`,
  cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int,int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int comp = target - nums[i];
            if (seen.count(comp)) return {seen[comp], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`,
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) return [seen.get(comp), i];
        seen.set(nums[i], i);
    }
    return [];
};
`,
}

const OTHERS: OtherParticipant[] = [
  {
    id: '1', name: 'ava', color: '#7c5cbf', initials: 'AV',
    status: 'submitted', lang: 'python',
    code: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, n in enumerate(nums):
            complement = target - n
            if complement in seen:
                return [seen[complement], i]
            seen[n] = i
        return []
`,
  },
  {
    id: '2', name: 'jonas', color: '#2f7d5b', initials: 'JN',
    status: 'online', lang: 'java',
    code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // brute force, optimize later
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[] { i, j };
                }
            }
        }
        return new int[] {};
    }
}
`,
  },
  {
    id: '3', name: 'mikael', color: '#b45f9d', initials: 'MK',
    status: 'typing', lang: 'javascript',
    code: `var twoSum = function(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (map.has(comp
`,
  },
  {
    id: '4', name: 'liam', color: '#c2703d', initials: 'LM',
    status: 'online', lang: 'cpp',
    code: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // TODO
    }
};
`,
  },
  {
    id: '5', name: 'sofia', color: '#3d9a9a', initials: 'SF',
    status: 'online', lang: 'python',
    code: `class Solution:
    def twoSum(self, nums, target):
        pass
`,
  },
  {
    id: '6', name: 'dev', color: '#8a63d2', initials: 'DV',
    status: 'typing', lang: 'java',
    code: `class Solution {
    public int[] twoSum(int[] nums, int target) {

    }
}
`,
  },
  {
    id: '7', name: 'priya', color: '#d24f7c', initials: 'PR',
    status: 'online', lang: 'javascript',
    code: `var twoSum = function(nums, target) {

};
`,
  },
  {
    id: '8', name: 'tom', color: '#5c8fd6', initials: 'TM',
    status: 'submitted', lang: 'python',
    code: `class Solution:
    def twoSum(self, nums, target):
        d = {}
        for i, x in enumerate(nums):
            if target - x in d:
                return [d[target - x], i]
            d[x] = i
`,
  },
]

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
  const [codeByLang, setCodeByLang] = useState<Record<Lang, string>>(STARTER)
  const [activeTab, setActiveTab] = useState<string>(ME_ID)
  const myCode = codeByLang[lang]

  /* room */
  const { id: roomId } = useParams<{ id: string }>()
  const [timeLeft,      setTimeLeft]      = useState(TOTAL_SECS)
  const [chatInput,     setChatInput]     = useState('')
  const [runLoading,    setRunLoading]    = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [results,       setResults]       = useState<TestResult[] | null>(null)
  const [submitted,     setSubmitted]     = useState(false)

  // realtime: anonymous presence + chat, plus the live problem & round timer
  const {
    messages,
    participants: liveParticipants,
    you,
    problem: liveProblem,
    round,
    connected,
    sendMessage: sendChat,
  } = useRoom(roomId)

  const chatEndRef = useRef<HTMLDivElement>(null)

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
  }

  function updateMyCode(v: string) {
    setCodeByLang(prev => ({ ...prev, [lang]: v }))
  }

  async function handleRun() {
    setRunLoading(true)
    setResults(null)
    await new Promise(r => setTimeout(r, 1100))
    setResults([
      { index: 1, input: 'nums=[2,7,11,15], target=9', expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 8 },
      { index: 2, input: 'nums=[3,2,4], target=6',     expected: '[1,2]', got: '[1,2]', passed: true,  runtimeMs: 4 },
      { index: 3, input: 'nums=[3,3], target=6',       expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 3 },
    ])
    setRunLoading(false)
  }

  async function handleSubmit() {
    setSubmitLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setResults([
      { index: 1, input: 'nums=[2,7,11,15], target=9', expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 8 },
      { index: 2, input: 'nums=[3,2,4], target=6',     expected: '[1,2]', got: '[1,2]', passed: true,  runtimeMs: 4 },
      { index: 3, input: 'nums=[3,3], target=6',       expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 3 },
      { index: 4, input: 'nums=[1,2,3,4], target=7',   expected: '[2,3]', got: '[2,3]', passed: true,  runtimeMs: 6 },
      { index: 5, input: 'nums=[0,4,3,0], target=0',   expected: '[0,3]', got: '[0,3]', passed: true,  runtimeMs: 5 },
    ])
    setSubmitted(true)
    setSubmitLoading(false)
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

  const viewingOther      = activeTab !== ME_ID
  const activeOther       = OTHERS.find(p => p.id === activeTab)
  const passedCount       = results?.filter(r => r.passed).length ?? 0
  const totalCount        = results?.length ?? 0
  const allPassed         = results !== null && passedCount === totalCount

  const me: OtherParticipant = {
    id: ME_ID, name: 'you', color: '#3b6fb0', initials: 'RØ',
    status: submitted ? 'submitted' : 'online', lang,
    code: myCode,
  }
  const allParticipants = [me, ...OTHERS]

  // "in the room" roster: real socket presence when connected, else the mock.
  const roster =
    liveParticipants.length > 0
      ? liveParticipants.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          initials: toInitials(p.name),
          isYou: !!you && p.id === you.id,
        }))
      : allParticipants.map(p => ({
          id: p.id,
          name: p.id === ME_ID ? (you?.name ?? 'you') : p.name,
          color: p.color,
          initials: p.initials,
          isYou: p.id === ME_ID,
        }))

  const difficultyChip = liveProblem
    ? `chip-${liveProblem.difficulty}`
    : 'chip-easy'

  return (
    <div className="room">

      {/* ── TOPBAR ── */}
      <header className="room-topbar">
        <div className="topbar-left">
          <BrandLink to="/" size={20} />
          <span className="topbar-sep" aria-hidden="true" />
        </div>

        <div className={`room-timer ${timerClass()}`}>{fmtTime(timeLeft)}</div>

        <div className="topbar-right">
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
                <h2 className="problem-title">{liveProblem.title}</h2>
                <span className={`chip ${difficultyChip}`}>
                  {liveProblem.difficulty[0].toUpperCase() + liveProblem.difficulty.slice(1)}
                </span>
              </div>
              <div className="problem-content">
                {liveProblem.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
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
              {/* your tab — always first */}
              <button
                className={`ptab ptab-mine${activeTab === ME_ID ? ' ptab-active' : ''}`}
                onClick={() => setActiveTab(ME_ID)}
              >
                <Avatar initials="RØ" color="#3b6fb0" size={20} />
                <span className="ptab-name">{you?.name ?? 'you'}</span>
                <span className="ptab-you-dot" />
              </button>
              {OTHERS.map(p => (
                <button
                  key={p.id}
                  className={`ptab${activeTab === p.id ? ' ptab-active' : ''}`}
                  onClick={() => setActiveTab(p.id)}
                >
                  <Avatar initials={p.initials} color={p.color} size={20} />
                  <span className="ptab-name">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="ptab-lang">
              {viewingOther && activeOther ? (
                <span className="lang-badge">{LANG_LABELS[activeOther.lang]}</span>
              ) : (
                <LangSelect value={lang} onChange={switchLang} />
              )}
            </div>
          </div>

          {/* editor body */}
          <div className="editor-body">
            {viewingOther && activeOther ? (
              /* blurred readonly view */
              <div className="blurred-editor">
                <pre className="blurred-code">{activeOther.code}</pre>
                <div className="blur-overlay">
                  <LockIcon />
                  <span>Solutions unlock when the round ends</span>
                </div>
              </div>
            ) : (
              /* your live Monaco editor */
              <Editor
                language={MONACO_LANG[lang]}
                value={myCode}
                onChange={v => updateMyCode(v ?? '')}
                theme="octree"
                beforeMount={setupTheme}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures: true,
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
                }}
              />
            )}
          </div>

          {/* run panel — always visible; hosts run/submit and their output */}
          <div className="run-panel">
            <div className="run-panel-header">
              <span className="run-panel-title">Console</span>
              {!viewingOther && submitted && <span className="submit-badge">✓ submitted</span>}
              {!viewingOther && (
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
              )}
            </div>

            <div className="run-panel-body">
              {viewingOther ? (
                <div className="run-panel-empty">Read-only — you're viewing {activeOther?.name}'s code.</div>
              ) : runLoading || submitLoading ? (
                <div className="run-panel-empty">{submitLoading ? 'Submitting…' : 'Running against test cases…'}</div>
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
                    {results.map(r => (
                      <div key={r.index} className={`result-case${r.passed ? ' result-pass' : ' result-fail'}`}>
                        <span className="result-icon">{r.passed ? <CheckIcon /> : <XIcon />}</span>
                        <span className="result-label">Case {r.index}</span>
                        <span className="result-input">{r.input}</span>
                        {!r.passed && (
                          <span className="result-diff">
                            expected <code>{r.expected}</code> got <code>{r.got}</code>
                          </span>
                        )}
                        <span className="result-ms">{r.runtimeMs}ms</span>
                      </div>
                    ))}
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
              {messages.map(m => {
                return (
                  <div key={m.id} className="chat-msg">
                    <Avatar initials={toInitials(m.authorName)} color={m.authorColor} size={36} />
                    <div className="chat-msg-body">
                      <div className="chat-msg-head">
                        <span className="chat-author" style={{ color: m.authorColor }}>
                          {m.authorName}
                        </span>
                        <span className="chat-ts">{fmtStamp(m.createdAt)}</span>
                      </div>
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
    </div>
  )
}

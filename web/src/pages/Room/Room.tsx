import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BrandLink } from '../../components/Logo'
import { SendIcon, PlayIcon, UploadIcon, LeaveIcon, CheckIcon, XIcon } from '../../components/Icons'
import './Room.css'

/* ---------- types ---------- */

type Lang = 'python' | 'java' | 'cpp' | 'javascript'

interface Participant {
  id: string
  name: string
  color: string
  initials: string
  status: 'online' | 'typing' | 'submitted'
}

interface ChatMessage {
  id: number
  author: string
  color: string
  text: string
  ts: string
}

interface TestResult {
  index: number
  input: string
  expected: string
  got: string
  passed: boolean
  runtimeMs: number
}

/* ---------- mock data ---------- */

const PARTICIPANTS: Participant[] = [
  { id: '1', name: 'ava',    color: '#7c5cbf', initials: 'AV', status: 'submitted' },
  { id: '2', name: 'jonas',  color: '#2f7d5b', initials: 'JN', status: 'online'    },
  { id: '3', name: 'mikael', color: '#b45f9d', initials: 'MK', status: 'typing'    },
  { id: '4', name: 'you',    color: '#3b6fb0', initials: 'RØ', status: 'online'    },
]

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 1, author: 'ava',    color: '#7c5cbf', text: 'classic two sum — hashmap all the way', ts: '18:02' },
  { id: 2, author: 'jonas',  color: '#2f7d5b', text: 'or two pointer if sorted?',              ts: '18:03' },
  { id: 3, author: 'ava',    color: '#7c5cbf', text: 'not sorted here so hashmap O(n)',         ts: '18:04' },
]

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

const LANG_LABELS: Record<Lang, string> = {
  python: 'Python 3', java: 'Java', cpp: 'C++', javascript: 'JavaScript',
}

const TOTAL_SECS = 30 * 60

/* ---------- sub-components ---------- */

function Avatar({ initials, color, size = 28 }: { initials: string; color: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials}
    </div>
  )
}

function StatusDot({ status }: { status: Participant['status'] }) {
  return <span className={`status-dot status-${status}`} title={status} />
}

/* ---------- main component ---------- */

export default function Room() {
  const [lang, setLang]               = useState<Lang>('python')
  const [code, setCode]               = useState(STARTER['python'])
  const [timeLeft, setTimeLeft]       = useState(TOTAL_SECS)
  const [messages, setMessages]       = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput]     = useState('')
  const [runLoading, setRunLoading]   = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [results, setResults]         = useState<TestResult[] | null>(null)
  const [submitted, setSubmitted]     = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const msgId      = useRef(INITIAL_MESSAGES.length + 1)

  /* countdown timer */
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  /* scroll chat to bottom on new message */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function fmtTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function timerClass() {
    if (timeLeft > 10 * 60) return 'timer-green'
    if (timeLeft > 5 * 60)  return 'timer-yellow'
    return 'timer-red'
  }

  function switchLang(l: Lang) {
    setLang(l)
    setCode(STARTER[l])
    setResults(null)
  }

  async function handleRun() {
    setRunLoading(true)
    setResults(null)
    await new Promise(r => setTimeout(r, 1100))
    setResults([
      { index: 1, input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 8  },
      { index: 2, input: 'nums = [3,2,4], target = 6',     expected: '[1,2]', got: '[1,2]', passed: true,  runtimeMs: 4  },
      { index: 3, input: 'nums = [3,3], target = 6',       expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 3  },
    ])
    setRunLoading(false)
  }

  async function handleSubmit() {
    setSubmitLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setResults([
      { index: 1,  input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 8  },
      { index: 2,  input: 'nums = [3,2,4], target = 6',     expected: '[1,2]', got: '[1,2]', passed: true,  runtimeMs: 4  },
      { index: 3,  input: 'nums = [3,3], target = 6',       expected: '[0,1]', got: '[0,1]', passed: true,  runtimeMs: 3  },
      { index: 4,  input: 'nums = [1,2,3,4], target = 7',   expected: '[2,3]', got: '[2,3]', passed: true,  runtimeMs: 6  },
      { index: 5,  input: 'nums = [0,4,3,0], target = 0',   expected: '[0,3]', got: '[0,3]', passed: true,  runtimeMs: 5  },
    ])
    setSubmitted(true)
    setSubmitLoading(false)
  }

  function sendMessage() {
    const text = chatInput.trim()
    if (!text) return
    setMessages(prev => [...prev, {
      id: msgId.current++,
      author: 'you',
      color: '#3b6fb0',
      text,
      ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    }])
    setChatInput('')
  }

  const passedCount = results?.filter(r => r.passed).length ?? 0
  const totalCount  = results?.length ?? 0
  const allPassed   = results !== null && passedCount === totalCount

  return (
    <div className="room">

      {/* ── TOPBAR ── */}
      <header className="room-topbar">
        <div className="topbar-left">
          <BrandLink to="/" size={20} />
          <span className="topbar-sep" aria-hidden="true" />
          <span className="topbar-room-name">two-pointer-tuesday</span>
          <span className="chip chip-medium">Medium</span>
        </div>

        <div className={`room-timer ${timerClass()}`}>
          {fmtTime(timeLeft)}
        </div>

        <div className="topbar-right">
          <div className="topbar-avatars">
            {PARTICIPANTS.slice(0, 4).map(p => (
              <Avatar key={p.id} initials={p.initials} color={p.color} size={26} />
            ))}
          </div>
          <Link to="/" className="btn-leave" title="Leave room">
            <LeaveIcon />
            Leave
          </Link>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="room-body">

        {/* ── PROBLEM PANEL ── */}
        <aside className="room-problem">
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
            </p>
            <p>You can return the answer in any order.</p>

            <h3 className="problem-section">Examples</h3>

            <div className="example-block">
              <div><span className="ex-label">Input</span> <code>nums = [2,7,11,15], target = 9</code></div>
              <div><span className="ex-label">Output</span> <code>[0,1]</code></div>
              <div><span className="ex-label">Explanation</span> <code>nums[0] + nums[1] == 9</code></div>
            </div>

            <div className="example-block">
              <div><span className="ex-label">Input</span> <code>nums = [3,2,4], target = 6</code></div>
              <div><span className="ex-label">Output</span> <code>[1,2]</code></div>
            </div>

            <div className="example-block">
              <div><span className="ex-label">Input</span> <code>nums = [3,3], target = 6</code></div>
              <div><span className="ex-label">Output</span> <code>[0,1]</code></div>
            </div>

            <h3 className="problem-section">Constraints</h3>
            <ul className="constraints">
              <li><code>2 ≤ nums.length ≤ 10⁴</code></li>
              <li><code>-10⁹ ≤ nums[i] ≤ 10⁹</code></li>
              <li><code>-10⁹ ≤ target ≤ 10⁹</code></li>
              <li>Only one valid answer exists.</li>
            </ul>
          </div>
        </aside>

        {/* ── EDITOR PANEL ── */}
        <div className="room-editor">
          {/* language tabs */}
          <div className="editor-tabbar">
            {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
              <button
                key={l}
                className={`editor-tab${lang === l ? ' editor-tab-active' : ''}`}
                onClick={() => switchLang(l)}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          {/* code area — replace with Monaco in production */}
          <div className="editor-wrap">
            <div className="editor-lines" aria-hidden="true">
              {code.split('\n').map((_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <textarea
              className="editor-textarea"
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          {/* toolbar */}
          <div className="editor-toolbar">
            <div className="toolbar-left">
              {submitted && <span className="submit-badge">✓ submitted</span>}
            </div>
            <div className="toolbar-right">
              <button
                className="btn-run"
                onClick={handleRun}
                disabled={runLoading || submitLoading}
              >
                <PlayIcon />
                {runLoading ? 'Running…' : 'Run'}
              </button>
              <button
                className="btn-submit-code btn-primary"
                onClick={handleSubmit}
                disabled={runLoading || submitLoading || submitted}
              >
                <UploadIcon />
                {submitLoading ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>

          {/* test results drawer */}
          {results && (
            <div className="results-drawer">
              <div className="results-header">
                <span className={allPassed ? 'results-pass' : 'results-fail'}>
                  {allPassed ? '✓' : '✗'} {passedCount} / {totalCount} tests passed
                </span>
                {results[0] && (
                  <span className="results-runtime">
                    avg {Math.round(results.reduce((a, r) => a + r.runtimeMs, 0) / results.length)} ms
                  </span>
                )}
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
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="room-sidebar">

          {/* participants */}
          <div className="sidebar-section sidebar-participants">
            <div className="sidebar-label">in the room · {PARTICIPANTS.length}</div>
            <ul className="participants-list">
              {PARTICIPANTS.map(p => (
                <li key={p.id} className="participant-row">
                  <Avatar initials={p.initials} color={p.color} size={28} />
                  <span className="participant-name">{p.name}</span>
                  <StatusDot status={p.status} />
                  {p.status === 'submitted' && (
                    <span className="participant-submitted">submitted</span>
                  )}
                  {p.status === 'typing' && (
                    <span className="participant-typing">typing…</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-divider" />

          {/* chat */}
          <div className="sidebar-section sidebar-chat">
            <div className="sidebar-label">chat</div>
            <div className="chat-messages">
              {messages.map(m => (
                <div key={m.id} className="chat-msg">
                  <span className="chat-author" style={{ color: m.color }}>{m.author}</span>
                  <span className="chat-text">{m.text}</span>
                  <span className="chat-ts">{m.ts}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form
              className="chat-input-row"
              onSubmit={e => { e.preventDefault(); sendMessage() }}
            >
              <input
                className="chat-input"
                placeholder="message…"
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

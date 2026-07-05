import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLink } from '../../components/Logo'
import { ArrowLeftIcon, UserIcon, CheckIcon, AlertIcon } from '../../components/Icons'
import { useAuth } from '../../lib/AuthContext'
import { AuthError } from '../../lib/auth'
import './Settings.css'

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,15}$/

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username ?? '')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const trimmed = username.trim()
  const unchanged = trimmed === user?.username
  const invalid = !USERNAME_RE.test(trimmed)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (unchanged || invalid || status.kind === 'saving') return

    setStatus({ kind: 'saving' })
    try {
      await updateProfile({ username: trimmed })
      setStatus({ kind: 'saved' })
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Could not save changes'
      setStatus({ kind: 'error', message })
    }
  }

  function onChange(value: string) {
    setUsername(value)
    if (status.kind !== 'idle') setStatus({ kind: 'idle' })
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  return (
    <div className="settings">
      <header className="settings-topbar">
        <BrandLink to="/" size={22} />
        <button className="settings-back" onClick={() => navigate('/lobby')}>
          <ArrowLeftIcon size={15} />
          <span>Back to Lobby</span>
        </button>
      </header>

      <div className="settings-body">
        <aside className="settings-nav">
          <div className="settings-nav-label">Settings</div>
          <button className="settings-nav-item settings-nav-active">
            <UserIcon size={15} />
            <span>Account</span>
          </button>
        </aside>

        <main className="settings-content">
          <div className="settings-heading">
            <h1>Account</h1>
            <p>Manage your public identity and account details.</p>
          </div>

          <section className="settings-card">
            <div className="settings-card-head">
              <h2>Username</h2>
              <p>This is how you appear to other people across octree.</p>
            </div>

            <form className="settings-form" onSubmit={handleSubmit}>
              <div className="settings-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => onChange(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={15}
                  className={status.kind === 'error' ? 'input-error' : ''}
                />
                <span className="settings-hint">
                  3–15 characters. Letters, numbers, hyphens and underscores.
                </span>
              </div>

              {status.kind === 'error' && (
                <div className="settings-msg settings-msg-error">
                  <AlertIcon />
                  <span>{status.message}</span>
                </div>
              )}
              {status.kind === 'saved' && (
                <div className="settings-msg settings-msg-ok">
                  <CheckIcon />
                  <span>Username updated.</span>
                </div>
              )}

              <div className="settings-form-foot">
                <button
                  type="submit"
                  className="btn-primary settings-save"
                  disabled={unchanged || invalid || status.kind === 'saving'}
                >
                  {status.kind === 'saving' ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-card-head">
              <h2>Account details</h2>
              <p>Read-only information tied to your account.</p>
            </div>

            <dl className="settings-readonly">
              <div className="settings-readonly-row">
                <dt>Email</dt>
                <dd>{user?.email ?? '—'}</dd>
              </div>
              <div className="settings-readonly-row">
                <dt>Member since</dt>
                <dd>{memberSince}</dd>
              </div>
            </dl>
          </section>
        </main>
      </div>
    </div>
  )
}

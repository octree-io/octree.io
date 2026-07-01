import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { GoogleIcon, EyeIcon, AlertIcon } from '../../components/Icons'

interface Errors { email?: string; password?: string; form?: string }

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  function validate(): Errors {
    const e: Errors = {}
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.'
    if (!password) e.password = 'Password is required.'
    return e
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      // TODO: call auth API
      await new Promise(r => setTimeout(r, 900))
      // on success: navigate('/lobby')
    } catch {
      setErrors({ form: 'Invalid email or password.' })
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    // TODO: initiate OAuth flow
    window.location.href = '/auth/google'
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to jump back into a room."
    >
      <button className="btn-google" onClick={handleGoogle} type="button">
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="auth-divider">or sign in with email</div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <div className="auth-error" role="alert">
            <AlertIcon />
            {errors.form}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-wrap">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={errors.password ? 'input-error' : ''}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPw} />
            </button>
          </div>
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div style={{ textAlign: 'right', marginTop: '-4px' }}>
          <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Forgot password?
          </Link>
        </div>

        <button
          className="btn-primary btn-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-footer-link">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </AuthLayout>
  )
}

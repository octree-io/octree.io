import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { GoogleIcon, EyeIcon, AlertIcon } from '../../components/Icons'
import { useAuth } from '../../lib/AuthContext'
import { AuthError, googleAuthUrl } from '../../lib/auth'

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  return score as 0 | 1 | 2 | 3
}

const strengthLabel = ['', 'Weak', 'Fair', 'Strong']
const strengthClass = ['', 'active-weak', 'active-fair', 'active-strong']

interface Errors {
  username?: string
  email?: string
  password?: string
  confirm?: string
  form?: string
}

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [errors, setErrors]     = useState<Errors>({})
  const [loading, setLoading]   = useState(false)

  const strength = passwordStrength(password)

  function validate(): Errors {
    const e: Errors = {}
    if (!username.trim()) e.username = 'Username is required.'
    else if (username.trim().length < 3) e.username = 'At least 3 characters.'
    else if (!/^[a-zA-Z0-9_-]+$/.test(username)) e.username = 'Letters, numbers, _ and - only.'

    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.'

    if (!password) e.password = 'Password is required.'
    else if (password.length < 8) e.password = 'At least 8 characters.'

    if (!confirm) e.confirm = 'Please confirm your password.'
    else if (confirm !== password) e.confirm = 'Passwords do not match.'

    return e
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      await register({ username: username.trim(), email: email.trim(), password })
      navigate('/lobby', { replace: true })
    } catch (err) {
      if (err instanceof AuthError && err.status === 409) {
        // Duplicate email or username — surface on the most likely field.
        const onEmail = /email/i.test(err.message)
        setErrors(onEmail ? { email: err.message } : { username: err.message })
      } else {
        const msg = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.'
        setErrors({ form: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleGoogle() {
    window.location.href = googleAuthUrl()
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start solving interviews with others — free."
    >
      <button className="btn-google" onClick={handleGoogle} type="button">
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="auth-divider">or sign up with email</div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <div className="auth-error" role="alert">
            <AlertIcon />
            {errors.form}
          </div>
        )}

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="coolcoder42"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className={errors.username ? 'input-error' : ''}
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>

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
              autoComplete="new-password"
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
          {password && (
            <>
              <div className="strength-bar" aria-hidden="true">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className={`strength-seg${strength >= i ? ' ' + strengthClass[strength] : ''}`}
                  />
                ))}
              </div>
              <span className="strength-label">{strengthLabel[strength]}</span>
            </>
          )}
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <div className="password-wrap">
            <input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={errors.confirm ? 'input-error' : ''}
            />
          </div>
          {errors.confirm && <span className="field-error">{errors.confirm}</span>}
        </div>

        <button
          className="btn-primary btn-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-footer-link">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

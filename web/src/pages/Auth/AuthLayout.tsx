import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './Auth.css'

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <line x1="16" y1="7" x2="8" y2="20" />
      <line x1="16" y1="7" x2="24" y2="20" />
      <line x1="8" y1="20" x2="8" y2="26" />
      <line x1="8" y1="20" x2="24" y2="20" />
      <circle cx="16" cy="7" r="3.5" className="node-root" />
      <circle cx="8" cy="20" r="3" />
      <circle cx="24" cy="20" r="3" />
      <circle cx="8" cy="26" r="2.4" />
    </svg>
  )
}

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-bg-glow" aria-hidden="true" />
      <div className="auth-bg-grid" aria-hidden="true" />

      <div className="auth-nav">
        <Link className="brand" to="/">
          <Logo />
          <span>octree<span className="brand-dot">.io</span></span>
        </Link>
      </div>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

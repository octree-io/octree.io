import { type ReactNode } from 'react'
import './Auth.css'
import { BrandLink } from '../../components/Logo'

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
        <BrandLink to="/" />
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

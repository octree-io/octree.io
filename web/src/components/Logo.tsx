import { Link } from 'react-router-dom'
import './Logo.css'

export function OctreeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
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

export function BrandLink({ to = '/', size = 22 }: { to?: string; size?: number }) {
  return (
    <Link className="brand" to={to}>
      <OctreeLogo size={size} />
      <span>octree<span className="brand-dot">.io</span></span>
    </Link>
  )
}

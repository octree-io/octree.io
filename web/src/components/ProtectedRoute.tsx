import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

/** Gate for authenticated-only routes. Redirects to /login when signed out. */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="route-loading">Loading…</div>
  }
  if (!user) {
    // Remember where they were headed so we can bounce back after login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

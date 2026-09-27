import { Outlet } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { HardRedirect } from "@/components/layout/HardRedirect"

// Sign-in happens on the admin app's own login page; the console only gates on the stored
// session (see lib/auth.tsx), and the API re-checks the role on every request anyway.
export function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <HardRedirect to="/login" />
  if (roles && roles.length > 0 && !roles.some((r) => user.roles.includes(r))) {
    return <HardRedirect to="/" />
  }
  return <Outlet />
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/**
 * Every route in this app requires the "Admin" role — unlike the Angular
 * app there's no mix of roles to gate between, so this is simpler than
 * Angular's authGuard+roleGuard pair. Wrap <Shell> with this once in
 * App.tsx rather than guarding each page individually.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole('Admin')) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

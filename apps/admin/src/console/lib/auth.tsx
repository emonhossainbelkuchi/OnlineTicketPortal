import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { clearSession, getStoredSession } from '../../lib/apiClient';

interface AuthUser {
  id: string;
  userName: string;
  roles: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * The management console does not have a login of its own any more: signing in happens once,
 * on the admin app's login page (apps/admin/src/pages/LoginPage.tsx), which stores the
 * session under "tp_admin_auth". This provider just reads that session, so every console
 * page keeps using the same useAuth() shape it was written against.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => {
    const session = getStoredSession();
    const user: AuthUser | null = session
      ? { id: session.userId, userName: session.userName, roles: session.roles }
      : null;
    return {
      user,
      token: session?.token ?? null,
      loading: false,
      logout: () => {
        clearSession();
        window.location.href = '/login';
      },
      hasRole: (...roles: string[]) => (user ? roles.some((r) => user.roles.includes(r)) : false),
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ApiError, AuthResponse, LoginRequest } from '@ticketportal-mono/models';
import { apiFetch, clearSession, getStoredSession, storeSession } from './apiClient';

interface CurrentUser {
  userId: string;
  userName: string;
  roles: string[];
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toCurrentUser(session: ReturnType<typeof getStoredSession>): CurrentUser | null {
  if (!session) return null;
  return { userId: session.userId, userName: session.userName, roles: session.roles };
}

/**
 * Same job as Angular's AuthService — POST /api/account/login against the
 * real AccountController, persists the session, exposes role checks. The
 * admin app only ever expects the "Admin" role back; anything else means
 * the person logged into the wrong app.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => toCurrentUser(getStoredSession()));

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: currentUser !== null,
      login: async (request: LoginRequest) => {
        const response = await apiFetch<AuthResponse>('account/login', {
          method: 'POST',
          body: request,
          skipAuth: true,
        });
        // ProtectedRoute bounces every non-Admin back to /login with no explanation, which
        // looks exactly like "login does nothing". Refuse here instead, with a reason.
        if (!response.roles?.includes('Admin')) {
          const notAdmin: ApiError = {
            status: 403,
            message:
              'This account is signed in correctly but is not a platform Admin. ' +
              'Customers, operators and staff use the main portal (http://localhost:4200).',
          };
          throw notAdmin;
        }
        storeSession(response);
        setCurrentUser(toCurrentUser(getStoredSession()));
      },
      logout: () => {
        clearSession();
        setCurrentUser(null);
      },
      hasRole: (...roles: string[]) => (currentUser ? roles.some((r) => currentUser.roles.includes(r)) : false),
    }),
    [currentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>');
  }
  return ctx;
}

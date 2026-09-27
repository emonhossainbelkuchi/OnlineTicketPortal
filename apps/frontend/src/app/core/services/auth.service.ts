import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AppRole,
  AuthResponse,
  ChangePasswordRequest,
  CurrentUser,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SessionInfo,
} from '@ticketportal-mono/models';

const STORAGE_KEY = 'tp_auth';

/**
 * Central auth/session service. Every other piece should go through this —
 * never read localStorage directly, never decode the JWT yourself.
 *
 * State is exposed as signals (`currentUser`, `isAuthenticated`) so template
 * bindings and guards stay in sync without manual subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly _currentUser = signal<CurrentUser | null>(this.restoreSession());

  /** The logged-in user, or null. Read-only signal — don't mutate directly. */
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => {
    const user = this._currentUser();
    return !!user && new Date(user.expiresAtUtc).getTime() > Date.now();
  });

  // RBAC Amendment v3 task 7. The JWT's `roles` claim (Admin/Staff/Customer) is only ever
  // half the story — capabilities is the database-resolved GET /api/account/me payload
  // (job role, operator scope, assigned counters, the flat permission list) that
  // role.guard.ts and the shells check for anything finer-grained than "logged in as Staff
  // at all". Null until ensureCapabilities() has resolved at least once for this session.
  private readonly _capabilities = signal<SessionInfo | null>(null);
  readonly capabilities = this._capabilities.asReadonly();

  /** POST /api/account/register. Every self-signup account lands in the "Customer" role. */
  register(request: RegisterRequest): Observable<string> {
    return this.api.post<string>('account/register', request);
  }

  /** POST /api/account/login. Persists the session and updates `currentUser` on success. */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('account/login', request).pipe(
      tap((response) => this.persistSession(response)),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._currentUser.set(null);
    this._capabilities.set(null);
  }

  /**
   * Loads (or returns the already-loaded) capability payload for the current session.
   * Cached in-memory for the life of the signed-in session — call again after any action
   * that could change it server-side (a role/counter-assignment edit) if you need it fresh
   * sooner than the next full page load.
   */
  ensureCapabilities(): Observable<SessionInfo> {
    const cached = this._capabilities();
    if (cached) return of(cached);
    return this.api.get<SessionInfo>('account/me').pipe(
      tap((info) => this._capabilities.set(info)),
    );
  }

  /**
   * True if the current session holds EVERY one of the given permissions (see
   * Authorization/Permissions.cs on the backend for the exact string catalogue). Admin
   * always passes, same as CurrentActor.HasPermission on the backend. Returns false —
   * fail closed — if capabilities haven't been loaded yet; callers that need a definitive
   * answer should route through ensureCapabilities() first (role.guard.ts does this).
   */
  hasPermission(...permissions: string[]): boolean {
    const info = this._capabilities();
    if (!info) return false;
    if (info.actorType === 'Admin') return true;
    return permissions.every((permission) => info.permissions.includes(permission));
  }

  /** POST /api/account/change-password. Available to any authenticated user, any role — the target user is always "whoever the bearer token belongs to" (see AccountController). */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.post<void>('account/change-password', request);
  }

  /** Starts a password recovery request. The API always gives the same response to protect account privacy. */
  forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('account/forgot-password', request);
  }

  /** Completes password recovery with the one-time token in the reset link. */
  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.api.post<void>('account/reset-password', request);
  }

  getToken(): string | null {
    const user = this._currentUser();
    if (!user) return null;
    return this.readRawToken();
  }

  /** True if the current user has ANY of the given roles. */
  hasRole(...roles: AppRole[]): boolean {
    const user = this._currentUser();
    if (!user) return false;
    return roles.some((role) => user.roles.includes(role));
  }

  /** Where to send someone right after login, based on their primary role. */
  homeRouteFor(user: CurrentUser): string {
    if (user.roles.includes('Admin')) return '/admin';
    if (user.roles.includes('Staff')) return '/counter';
    if (user.roles.includes('Operator')) return '/operator';
    return '/search';
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    this._currentUser.set({
      userId: response.userId,
      userName: response.userName,
      roles: response.roles,
      expiresAtUtc: response.expiresAtUtc,
    });
    // A fresh login means a fresh session — drop any capabilities cached for whoever was
    // signed in before, so the next ensureCapabilities() call re-resolves for THIS user.
    this._capabilities.set(null);
  }

  private restoreSession(): CurrentUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed: AuthResponse = JSON.parse(raw);
      if (new Date(parsed.expiresAtUtc).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return {
        userId: parsed.userId,
        userName: parsed.userName,
        roles: parsed.roles,
        expiresAtUtc: parsed.expiresAtUtc,
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private readRawToken(): string | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: AuthResponse = JSON.parse(raw);
      return parsed.token;
    } catch {
      return null;
    }
  }
}

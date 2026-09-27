import { AppRole } from './role.model';

// Mirrors DTO/AuthDtos.cs -> RegisterDto exactly (field names and casing
// matter — ASP.NET model binding is case-insensitive for JSON but keep it
// consistent anyway).
export interface RegisterRequest {
  fullName: string;
  userName: string;
  email: string;
  password: string;
}

// Mirrors DTO/AuthDtos.cs -> LoginDto.
export interface LoginRequest {
  userName: string;
  password: string;
}

// Mirrors DTO/AuthDtos.cs -> ChangePasswordDto.
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Mirrors DTO/AuthDtos.cs. These two public requests deliberately do not require a session:
// recovery happens precisely when the customer cannot log in.
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

// Mirrors DTO/AuthDtos.cs -> AuthResponseDto. `expiresAtUtc` comes back as
// an ISO string over JSON — convert to a Date only where you actually need
// to do date math (AuthService does this once, on login).
export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  userId: string;
  userName: string;
  roles: AppRole[];
}

// What AuthService exposes to the rest of the app — decoded/derived from
// the stored token, not a raw backend DTO.
export interface CurrentUser {
  userId: string;
  userName: string;
  roles: AppRole[];
  expiresAtUtc: string;
}

// RBAC Amendment v3 task 7. Mirrors DTO/AuthDtos.cs -> SessionCounterDto.
export interface SessionCounter {
  id: string;
  counterName: string;
}

// RBAC Amendment v3 task 7. Mirrors DTO/AuthDtos.cs -> SessionInfoDto exactly. Fetched from
// GET /api/account/me — the database-resolved, always-current answer to "what can this
// session actually do right now". The JWT's `roles` claim above only ever says Admin/Staff/
// Customer, which is NOT enough to tell a CounterStaff clerk apart from an Operator Manager;
// role.guard.ts and the counter/finance/operator shells check `permissions` from THIS object,
// not `CurrentUser.roles`, for anything finer-grained than "logged in as Staff at all".
export interface SessionInfo {
  userId: string;
  userName: string;
  fullName: string;
  actorType: 'Admin' | 'Staff' | 'UnprovisionedStaff' | 'Customer' | 'Anonymous';
  jobRole: string | null;
  busOperatorId: string | null;
  busOperatorName: string | null;
  assignedCounters: SessionCounter[];
  permissions: string[];
}

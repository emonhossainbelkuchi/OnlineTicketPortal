// These four match Data/DbSeeder.cs in the backend EXACTLY — do not invent
// extra roles here, the JWT only ever carries these strings in its `role`
// claims (see AccountController.Login -> AuthResponseDto.Roles).
//
// Note there is no separate "CounterStaff" or "FinanceStaff" login role on
// the backend today — Piece 5 (Counter) and Piece 6 (Finance) both sit
// behind the single "Staff" role. If your screens need finer-grained access
// than that, it has to come from somewhere else (e.g. StaffProfilesController
// job title) — don't assume the JWT will ever say "CounterStaff".
export type AppRole = 'Admin' | 'Staff' | 'Operator' | 'Customer';

export const APP_ROLES: Record<string, AppRole> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  OPERATOR: 'Operator',
  CUSTOMER: 'Customer',
};

import { AppRole } from './role.model';
import { StaffRole } from './enums';

// Mirrors DTO/AdminDtos.cs -> AdminUserListItemDto. GET /api/admin/users (Admin-only) — backs
// Piece 7's User & Role Management screen. Nothing else in the API lists user accounts, so this
// is also the only way an Admin finds a userId to pass into AssignRoleRequest below.
export interface AdminUserListItem {
  id: string;
  userName: string;
  email: string | null;
  fullName: string;
  isActive: boolean;
  createdAtUtc: string;
  lastLoginAtUtc: string | null;
  roles: AppRole[];
  // From StaffProfile.BusOperatorId when this account has one — null for platform-wide
  // Staff/Admin accounts or a Customer.
  busOperatorId: string | null;
}

// Mirrors DTO/AdminDtos.cs -> AssignRoleDto. POST /api/admin/users/{userId}/roles — replaces
// whatever role(s) the user currently has with exactly this one.
export interface AssignRoleRequest {
  role: AppRole;
}

// Mirrors DTO/AdminDtos.cs -> AssignRoleResponseDto.
export interface AssignRoleResponse {
  userId: string;
  userName: string;
  roles: AppRole[];
}

// Mirrors DTO/AdminDtos.cs -> CreateStaffAccountDto. POST /api/admin/staff — creates the login
// AND its StaffProfile together. Never "Customer" here — that's /api/account/register.
export interface CreateStaffAccountRequest {
  fullName: string;
  userName: string;
  email: string;
  password: string;
  role: 'Staff' | 'Operator' | 'Admin';
  busOperatorId?: string | null;
  employeeCode: string;
  jobRole: StaffRole;
}

// Mirrors DTO/AdminDtos.cs -> CreateStaffAccountResponseDto.
export interface CreateStaffAccountResponse {
  userId: string;
  staffProfileId: string;
  userName: string;
  role: string;
  busOperatorId: string | null;
}

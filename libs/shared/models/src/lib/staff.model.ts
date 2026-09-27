import { LicenseType, StaffRole, AttendanceStatus } from './enums';

// Mirrors DTO/PeopleDtos.cs -> StaffProfileResponseDto/CreateDto/UpdateDto.
// GET /api/staffprofiles is auto-scoped server-side (an operator's own Operator/Staff account
// only ever sees their own operator's staff) — this is also what Piece 4's OperatorContextService
// uses to resolve "which BusOperator does the logged-in user belong to" (see
// features/operator/services/operator-context.service.ts): find the entry whose userId matches
// the current session and read its busOperatorId. Piece 5's counter/HR screens (attendance,
// salary) work off StaffProfile.id, the same records this defines.
export interface StaffProfile {
  id: string;
  userId: string;
  busOperatorId: string | null;
  employeeCode: string;
  role: StaffRole;
  nationalIdNumber: string | null;
  joiningDate: string | null; // yyyy-MM-dd (DateOnly)
  address: string | null;
  totalTripsCompleted: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface StaffProfileCreateRequest {
  userId: string;
  busOperatorId?: string | null;
  employeeCode: string;
  role: StaffRole;
  nationalIdNumber?: string | null;
  joiningDate?: string | null;
  address?: string | null;
  totalTripsCompleted: number;
  isActive: boolean;
}

export interface StaffProfileUpdateRequest {
  employeeCode: string;
  role: StaffRole;
  nationalIdNumber?: string | null;
  joiningDate?: string | null;
  address?: string | null;
  totalTripsCompleted: number;
  isActive: boolean;
  rowVersion: string;
}

// Mirrors DTO/PeopleDtos.cs -> DriverLicenseResponseDto/CreateDto/UpdateDto. Piece 4's Fleet
// screen (driver license records) — scoped to StaffProfiles belonging to this operator.
export interface DriverLicense {
  id: string;
  staffProfileId: string;
  licenseNumber: string;
  type: LicenseType;
  issueDate: string; // yyyy-MM-dd (DateOnly)
  expiryDate: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface DriverLicenseCreateRequest {
  staffProfileId: string;
  licenseNumber: string;
  type: LicenseType;
  issueDate: string;
  expiryDate: string;
}

export interface DriverLicenseUpdateRequest {
  licenseNumber: string;
  type: LicenseType;
  issueDate: string;
  expiryDate: string;
  rowVersion: string;
}

// Mirrors StaffAttendanceCreateDto/UpdateDto. StaffProfileId is verified
// against the caller's own operator scope server-side.
export interface StaffAttendanceCreateRequest {
  staffProfileId: string;
  attendanceDate: string; // yyyy-MM-dd
  status: AttendanceStatus;
  remarks?: string;
}

export interface StaffAttendanceUpdateRequest {
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string;
  rowVersion: string;
}

export interface StaffAttendance {
  id: string;
  staffProfileId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Mirrors StaffSalaryCreateDto/UpdateDto.
export interface StaffSalaryCreateRequest {
  staffProfileId: string;
  payPeriodStart: string; // yyyy-MM-dd
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string;
  paymentReference?: string;
}

export interface StaffSalaryUpdateRequest {
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string;
  paymentReference?: string;
  rowVersion: string;
}

export interface StaffSalary {
  id: string;
  staffProfileId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc: string | null;
  paymentReference: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

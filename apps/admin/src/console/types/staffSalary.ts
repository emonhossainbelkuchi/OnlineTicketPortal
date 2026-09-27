// Mirrors StaffSalaryCreateDto / StaffSalaryUpdateDto / StaffSalaryResponseDto on the API.
// byte[] RowVersion comes over the wire as a base64 string — treat it as an opaque token,
// just echo back whatever GET/Create gave you when you call Update.

export interface StaffSalaryResponseDto {
  id: string;
  staffProfileId: string;
  payPeriodStart: string; // "yyyy-MM-dd"
  payPeriodEnd: string; // "yyyy-MM-dd"
  amount: number;
  isPaid: boolean;
  paidAtUtc: string | null;
  paymentReference: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string; // base64
}

// StaffProfileId is required on create, then never editable again (see backend DTO notes) —
// that's why it's absent from Update below.
export interface StaffSalaryCreateDto {
  staffProfileId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string | null;
  paymentReference?: string | null;
}

export interface StaffSalaryUpdateDto {
  payPeriodStart: string;
  payPeriodEnd: string;
  amount: number;
  isPaid: boolean;
  paidAtUtc?: string | null;
  paymentReference?: string | null;
  rowVersion: string; // must be the rowVersion you last read, or the API returns 409
}

// Minimal shape used to populate the StaffProfileId dropdown. Swap for whatever your real
// StaffProfile type/service already looks like if one exists in the project.
export interface StaffProfileOption {
  id: string;
  employeeCode: string;
}

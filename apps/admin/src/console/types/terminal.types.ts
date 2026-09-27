// src/types/terminal.types.ts
// Mirrors TicketPortal.Api.DTO TerminalCreateDto / TerminalUpdateDto / TerminalResponseDto exactly.

export interface TerminalCreateDto {
  name: string;          // [Required, StringLength(120)]
  code: string;           // [Required, StringLength(20)]
  city: string;            // [Required, StringLength(80)]
  district: string;        // [Required, StringLength(80)]
  division: string;        // [Required, StringLength(80)]
  country: string;         // [Required, StringLength(80)] default "Bangladesh"
  address: string;         // [Required, StringLength(250)]
  latitude?: number | null;  // [Range(-90, 90)]
  longitude?: number | null; // [Range(-180, 180)]
  isActive: boolean;
}

// Update = Create + RowVersion (optimistic concurrency — echo back what GET returned).
export interface TerminalUpdateDto extends TerminalCreateDto {
  rowVersion: string;
}

export interface TerminalResponseDto {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  division: string;
  country: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

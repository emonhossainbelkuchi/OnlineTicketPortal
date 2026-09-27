// src/types/offer.types.ts
//
// Mirrors OffersController exactly. Reading is open to everyone (offers are
// meant to be shown to customers browsing the site); Create/Update/Delete
// are Admin-only. Update requires RowVersion (optimistic concurrency) — a
// 409 means someone else changed it first.

export enum OfferStatus {
  Active = 1,
  Expired = 2,
  Disabled = 3,
}

export const OfferStatusLabel: Record<OfferStatus, string> = {
  [OfferStatus.Active]: 'Active',
  [OfferStatus.Expired]: 'Expired',
  [OfferStatus.Disabled]: 'Disabled',
};

export const OfferStatusBadgeClass: Record<OfferStatus, string> = {
  [OfferStatus.Active]: 'bg-success',
  [OfferStatus.Expired]: 'bg-secondary',
  [OfferStatus.Disabled]: 'bg-danger',
};

export const OfferStatusIcon: Record<OfferStatus, string> = {
  [OfferStatus.Active]: 'fa-solid fa-circle-check',
  [OfferStatus.Expired]: 'fa-regular fa-clock',
  [OfferStatus.Disabled]: 'fa-solid fa-ban',
};

// Thin slice of BusOperatorResponseDto — only what the offer form's operator
// dropdown / details page needs.
export interface BusOperatorSummary {
  id: string;
  name: string;
}

export interface OfferCreateDto {
  busOperatorId: string | null;
  title: string;
  description: string | null;
  status: OfferStatus;
  startDateUtc: string;
  endDateUtc: string;
}

export interface OfferUpdateDto extends OfferCreateDto {
  rowVersion: string;
}

export interface OfferResponseDto {
  id: string;
  busOperatorId: string | null;
  title: string;
  description: string | null;
  status: OfferStatus;
  startDateUtc: string;
  endDateUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Client-side list params — GetAll takes none, so search/filter/sort/paging
// all happen in the hook.
export interface OfferListParams {
  search?: string;
  status?: OfferStatus | 'all';
  groupByStatus?: boolean;
  sortBy?: 'title' | 'startDateUtc' | 'endDateUtc' | 'status' | 'createdAtUtc';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

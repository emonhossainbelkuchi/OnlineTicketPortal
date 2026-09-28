import type { BusRef } from './busAmenityMapping.types';
export type { BusRef };

export interface BusImage {
  id: string;
  busId: string;
  imageUrl: string;
  caption: string | null;
  isPrimary: boolean;
  displayOrder: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string; // byte[] arrives as a base64 string over JSON — echoed back as-is on update
}

export interface BusImageCreateRequest {
  busId: string;
  imageUrl: string;
  caption: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface BusImageUpdateRequest extends BusImageCreateRequest {
  rowVersion: string;
}

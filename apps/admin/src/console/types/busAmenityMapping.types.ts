// api/BusAmenityMappings (BusAmenityMappingsController) is a plain CRUD junction table —
// { id, busId, busAmenityId } — with no bus/amenity names on it. api/Buses and
// api/BusAmenities are separately-fetched reference lists (also real, DB-backed CRUD
// endpoints) used purely to label those ids in the UI; see busAmenityMappingService.ts.

export interface BusAmenityMapping {
  id: string;
  busId: string;
  busAmenityId: string;
}

export interface BusAmenityMappingCreateRequest {
  busId: string;
  busAmenityId: string;
}

// Only the fields this feature actually needs from the much larger Bus/BusAmenity DTOs.
export interface BusRef {
  id: string;
  registrationNumber: string;
  brand: string | null;
  model: string | null;
}

export interface BusAmenityRef {
  id: string;
  name: string;
  iconUrl: string | null;
  isActive: boolean;
}

import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  Bus,
  BusAmenity,
  BusAmenityMapping,
  BusCategory,
  BusCreateRequest,
  BusImage,
  BusImageCreateRequest,
  BusImageUpdateRequest,
  BusMaintenanceLog,
  BusMaintenanceLogCreateRequest,
  BusMaintenanceLogUpdateRequest,
  BusUpdateRequest,
  DriverLicense,
  DriverLicenseCreateRequest,
  DriverLicenseUpdateRequest,
  StaffProfile,
} from '@ticketportal-mono/models';

/**
 * Screen 2 (Fleet). Buses is the master-detail write surface (seats travel with it);
 * BusCategories/BusAmenities/BusAmenityMappings are Admin-only to WRITE
 * (BusCategoriesController/BusAmenitiesController/BusAmenityMappingsController all hard-Forbid
 * non-Admin writes) so this only exposes reads for those three — the fleet screen shows them as
 * reference pickers/badges, not editable lists, for an Operator/Staff account.
 */
@Injectable({ providedIn: 'root' })
export class FleetService {
  private readonly api = inject(ApiService);

  /** Buses.GetAll is unscoped — always returns every operator's buses — filter client-side. */
  listBuses(busOperatorId: string): Observable<Bus[]> {
    return this.api.get<Bus[]>('buses').pipe(map((buses) => buses.filter((b) => b.busOperatorId === busOperatorId)));
  }

  getBus(id: string): Observable<Bus> {
    return this.api.get<Bus>(`buses/${id}`);
  }

  createBus(dto: BusCreateRequest): Observable<Bus> {
    return this.api.post<Bus>('buses', dto);
  }

  updateBus(id: string, dto: BusUpdateRequest): Observable<Bus> {
    return this.api.put<Bus>(`buses/${id}`, dto);
  }

  deleteBus(id: string): Observable<void> {
    return this.api.delete<void>(`buses/${id}`);
  }

  uploadBusCoverImage(id: string, file: File): Observable<{ imageUrl: string }> {
    return this.api.postForm<{ imageUrl: string }>(`buses/${id}/images`, file);
  }

  // --- Reference data (read-only for Piece 4 — see class comment) ---

  listCategories(): Observable<BusCategory[]> {
    return this.api.get<BusCategory[]>('buscategories');
  }

  listAmenities(): Observable<BusAmenity[]> {
    return this.api.get<BusAmenity[]>('busamenities');
  }

  listAmenityMappings(busId: string): Observable<BusAmenityMapping[]> {
    return this.api.get<BusAmenityMapping[]>('busamenitymappings').pipe(map((m) => m.filter((x) => x.busId === busId)));
  }

  // --- Gallery (BusImages — plain URL entries, distinct from the single cover-photo upload above) ---

  listImages(busId: string): Observable<BusImage[]> {
    return this.api.get<BusImage[]>('busimages').pipe(map((imgs) => imgs.filter((i) => i.busId === busId)));
  }

  createImage(dto: BusImageCreateRequest): Observable<BusImage> {
    return this.api.post<BusImage>('busimages', dto);
  }

  updateImage(id: string, dto: BusImageUpdateRequest): Observable<BusImage> {
    return this.api.put<BusImage>(`busimages/${id}`, dto);
  }

  deleteImage(id: string): Observable<void> {
    return this.api.delete<void>(`busimages/${id}`);
  }

  // --- Maintenance log ---

  listMaintenanceLogs(busId: string): Observable<BusMaintenanceLog[]> {
    return this.api
      .get<BusMaintenanceLog[]>('busmaintenancelogs')
      .pipe(map((logs) => logs.filter((l) => l.busId === busId)));
  }

  createMaintenanceLog(dto: BusMaintenanceLogCreateRequest): Observable<BusMaintenanceLog> {
    return this.api.post<BusMaintenanceLog>('busmaintenancelogs', dto);
  }

  updateMaintenanceLog(id: string, dto: BusMaintenanceLogUpdateRequest): Observable<BusMaintenanceLog> {
    return this.api.put<BusMaintenanceLog>(`busmaintenancelogs/${id}`, dto);
  }

  deleteMaintenanceLog(id: string): Observable<void> {
    return this.api.delete<void>(`busmaintenancelogs/${id}`);
  }

  // --- Driver licenses (hangs off StaffProfile, not Bus — see DriverLicensesController) ---

  /** Drivers to pick from — StaffProfiles filtered to the Driver job role for this operator. */
  listDrivers(busOperatorId: string): Observable<StaffProfile[]> {
    return this.api
      .get<StaffProfile[]>('staffprofiles')
      .pipe(map((staff) => staff.filter((s) => s.busOperatorId === busOperatorId && s.role === 'Driver')));
  }

  listDriverLicenses(staffProfileId: string): Observable<DriverLicense[]> {
    return this.api
      .get<DriverLicense[]>('driverlicenses')
      .pipe(map((licenses) => licenses.filter((l) => l.staffProfileId === staffProfileId)));
  }

  /** All licenses visible to this operator (already server-scoped via StaffProfilesController
   * join) — used by the fleet overview to flag drivers with an expiring/expired license. */
  listAllDriverLicenses(): Observable<DriverLicense[]> {
    return this.api.get<DriverLicense[]>('driverlicenses');
  }

  createDriverLicense(dto: DriverLicenseCreateRequest): Observable<DriverLicense> {
    return this.api.post<DriverLicense>('driverlicenses', dto);
  }

  updateDriverLicense(id: string, dto: DriverLicenseUpdateRequest): Observable<DriverLicense> {
    return this.api.put<DriverLicense>(`driverlicenses/${id}`, dto);
  }

  deleteDriverLicense(id: string): Observable<void> {
    return this.api.delete<void>(`driverlicenses/${id}`);
  }
}

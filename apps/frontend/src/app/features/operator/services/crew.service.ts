import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { StaffProfile, TripCrew, TripCrewCreateRequest, TripCrewUpdateRequest } from '@ticketportal-mono/models';

/** Screen 5 (Crew Assignment). See TripCrewsController + StaffProfilesController. */
@Injectable({ providedIn: 'root' })
export class CrewService {
  private readonly api = inject(ApiService);

  /** GetAll is auto-scoped for an Operator-scoped caller (join through Trip.BusOperatorId) but
   * not for platform Staff/Admin — filter client-side against the active operator's trip ids. */
  listTripCrews(tripIds: string[]): Observable<TripCrew[]> {
    return this.api.get<TripCrew[]>('tripcrews').pipe(map((crews) => crews.filter((c) => tripIds.includes(c.tripId))));
  }

  createAssignment(dto: TripCrewCreateRequest): Observable<TripCrew> {
    return this.api.post<TripCrew>('tripcrews', dto);
  }

  updateAssignment(id: string, dto: TripCrewUpdateRequest): Observable<TripCrew> {
    return this.api.put<TripCrew>(`tripcrews/${id}`, dto);
  }

  removeAssignment(id: string): Observable<void> {
    return this.api.delete<void>(`tripcrews/${id}`);
  }

  /** StaffProfiles is auto-scoped server-side (StaffProfilesController.GetAll) — this operator's
   * own staff, plus platform staff (who can crew any operator's trip per TripCrewsController's
   * ValidateAssignmentAsync), come back already filtered. Only active staff are worth offering
   * in the assignment picker. */
  listAssignableStaff(): Observable<StaffProfile[]> {
    return this.api.get<StaffProfile[]>('staffprofiles').pipe(map((staff) => staff.filter((s) => s.isActive)));
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  StaffAttendance,
  StaffAttendanceCreateRequest,
  StaffAttendanceUpdateRequest,
  StaffProfile,
  StaffProfileCreateRequest,
  StaffProfileUpdateRequest,
  StaffSalary,
  StaffSalaryCreateRequest,
  StaffSalaryUpdateRequest,
} from '@ticketportal-mono/models';

/**
 * Wraps StaffProfilesController/StaffAttendancesController/
 * StaffSalariesController together (Piece 5, screen 5 — HR mini-module).
 * Kept as one service since the three screens are always used together
 * (attendance/salary rows are picked by StaffProfileId from the profile
 * list) — same operator-scoping shape on all three controllers.
 */
@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly api = inject(ApiService);

  // ---- Profiles ---------------------------------------------------------
  listProfiles(): Observable<StaffProfile[]> {
    return this.api.get<StaffProfile[]>('staffprofiles');
  }

  createProfile(request: StaffProfileCreateRequest): Observable<StaffProfile> {
    return this.api.post<StaffProfile>('staffprofiles', request);
  }

  updateProfile(id: string, request: StaffProfileUpdateRequest): Observable<StaffProfile> {
    return this.api.put<StaffProfile>(`staffprofiles/${id}`, request);
  }

  deleteProfile(id: string): Observable<void> {
    return this.api.delete<void>(`staffprofiles/${id}`);
  }

  // ---- Attendance ---------------------------------------------------------
  listAttendance(): Observable<StaffAttendance[]> {
    return this.api.get<StaffAttendance[]>('staffattendances');
  }

  createAttendance(request: StaffAttendanceCreateRequest): Observable<StaffAttendance> {
    return this.api.post<StaffAttendance>('staffattendances', request);
  }

  updateAttendance(id: string, request: StaffAttendanceUpdateRequest): Observable<StaffAttendance> {
    return this.api.put<StaffAttendance>(`staffattendances/${id}`, request);
  }

  deleteAttendance(id: string): Observable<void> {
    return this.api.delete<void>(`staffattendances/${id}`);
  }

  // ---- Salary ---------------------------------------------------------
  listSalaries(): Observable<StaffSalary[]> {
    return this.api.get<StaffSalary[]>('staffsalaries');
  }

  createSalary(request: StaffSalaryCreateRequest): Observable<StaffSalary> {
    return this.api.post<StaffSalary>('staffsalaries', request);
  }

  updateSalary(id: string, request: StaffSalaryUpdateRequest): Observable<StaffSalary> {
    return this.api.put<StaffSalary>(`staffsalaries/${id}`, request);
  }

  deleteSalary(id: string): Observable<void> {
    return this.api.delete<void>(`staffsalaries/${id}`);
  }
}

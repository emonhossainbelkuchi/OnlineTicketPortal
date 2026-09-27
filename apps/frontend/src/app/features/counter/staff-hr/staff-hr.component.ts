import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StaffAttendance, StaffProfile, StaffRole, StaffSalary } from '@ticketportal-mono/models';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpModalComponent, TpSpinnerComponent, TpStatusPillComponent, TpTabsComponent } from '../../../shared/ui';
import { StaffService } from '../services/staff.service';

const STAFF_ROLES: StaffRole[] = [
  'SuperAdmin',
  'Admin',
  'Manager',
  'Operator',
  'CounterStaff',
  'BusOwner',
  'Driver',
  'Supervisor',
  'Helper',
  'Finance',
];

type ModalKind = 'profile' | 'attendance' | 'salary';

/**
 * Piece 5, screen 5 — HR mini-module. Three tabs, each a simple CRUD table
 * against StaffProfilesController/StaffAttendancesController/
 * StaffSalariesController — same operator-scoping shape on all three, so
 * one component covers all three rather than three near-identical files.
 *
 * NOTE: creating a profile requires an existing UserId (a GUID from an
 * already-registered login) — there's no user picker here because no
 * "list registered users" endpoint is exposed to this piece. The normal
 * way to onboard a brand-new staff member is AdminController.CreateStaff
 * (Piece 7), which creates the login and profile together; this screen's
 * Create is the secondary path for attaching a profile to an existing one.
 */
@Component({
  selector: 'tp-staff-hr',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TpButtonDirective,
    TpCardComponent,
    TpEmptyStateComponent,
    TpModalComponent,
    TpSpinnerComponent,
    TpStatusPillComponent,
    TpTabsComponent,
  ],
  template: `
    <tp-tabs [tabs]="['Profiles', 'Attendance', 'Salary']" [(activeIndex)]="tabIndex" />

    <tp-card>
      @switch (tabIndex) {
        @case (0) {
          <div class="tp-toolbar">
            <h2>Staff Profiles</h2>
            <button tpButton variant="primary" (click)="openProfileCreate()">+ New Profile</button>
          </div>
          @if (loadingProfiles()) {
            <tp-spinner />
          } @else if (profiles().length === 0) {
            <tp-empty-state title="No staff profiles yet" />
          } @else {
            <div class="tp-table-wrap">
              <table class="tp-table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Role</th>
                    <th>Joining Date</th>
                    <th>Trips</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (profile of profiles(); track profile.id) {
                    <tr>
                      <td>{{ profile.employeeCode }}</td>
                      <td>{{ profile.role }}</td>
                      <td>{{ profile.joiningDate ?? '—' }}</td>
                      <td>{{ profile.totalTripsCompleted }}</td>
                      <td><tp-status-pill [status]="profile.isActive ? 'Active' : 'Inactive'" /></td>
                      <td class="tp-table__actions">
                        <button tpButton variant="ghost" size="sm" (click)="openProfileEdit(profile)">Edit</button>
                        <button tpButton variant="danger" size="sm" (click)="deleteProfile(profile)">Delete</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        @case (1) {
          <div class="tp-toolbar">
            <h2>Attendance</h2>
            <button tpButton variant="primary" [disabled]="profiles().length === 0" (click)="openAttendanceCreate()">
              + Log Attendance
            </button>
          </div>
          @if (loadingAttendance()) {
            <tp-spinner />
          } @else if (attendance().length === 0) {
            <tp-empty-state title="No attendance records yet" />
          } @else {
            <div class="tp-table-wrap">
              <table class="tp-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (record of attendance(); track record.id) {
                    <tr>
                      <td>{{ profileLabel(record.staffProfileId) }}</td>
                      <td>{{ record.attendanceDate }}</td>
                      <td><tp-status-pill [status]="record.status" /></td>
                      <td>{{ record.remarks ?? '—' }}</td>
                      <td class="tp-table__actions">
                        <button tpButton variant="ghost" size="sm" (click)="openAttendanceEdit(record)">Edit</button>
                        <button tpButton variant="danger" size="sm" (click)="deleteAttendance(record)">Delete</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        @case (2) {
          <div class="tp-toolbar">
            <h2>Salary</h2>
            <button tpButton variant="primary" [disabled]="profiles().length === 0" (click)="openSalaryCreate()">
              + New Pay Record
            </button>
          </div>
          @if (loadingSalaries()) {
            <tp-spinner />
          } @else if (salaries().length === 0) {
            <tp-empty-state title="No salary records yet" />
          } @else {
            <div class="tp-table-wrap">
              <table class="tp-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Pay Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Reference</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (salary of salaries(); track salary.id) {
                    <tr>
                      <td>{{ profileLabel(salary.staffProfileId) }}</td>
                      <td>{{ salary.payPeriodStart }} → {{ salary.payPeriodEnd }}</td>
                      <td>{{ salary.amount }}</td>
                      <td><tp-status-pill [status]="salary.isPaid ? 'Paid' : 'Pending'" /></td>
                      <td>{{ salary.paymentReference ?? '—' }}</td>
                      <td class="tp-table__actions">
                        <button tpButton variant="ghost" size="sm" (click)="openSalaryEdit(salary)">Edit</button>
                        <button tpButton variant="danger" size="sm" (click)="deleteSalary(salary)">Delete</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </tp-card>

    <tp-modal [open]="!!modal()" [title]="modalTitle()" (closed)="closeModal()">
      @switch (modal()?.kind) {
        @case ('profile') {
          <form [formGroup]="profileForm" class="tp-form">
            @if (!modal()?.editing) {
              <label>
                User ID <span class="tp-muted">(existing login's GUID)</span>
                <input type="text" formControlName="userId" />
              </label>
              @if (auth.hasRole('Admin')) {
                <label>
                  Bus Operator ID <span class="tp-muted">(leave blank for platform staff)</span>
                  <input type="text" formControlName="busOperatorId" />
                </label>
              }
            }
            <label>
              Employee Code
              <input type="text" formControlName="employeeCode" />
            </label>
            <label>
              Role
              <select formControlName="role">
                @for (role of staffRoles; track role) {
                  <option [value]="role">{{ role }}</option>
                }
              </select>
            </label>
            <label>
              National ID Number
              <input type="text" formControlName="nationalIdNumber" />
            </label>
            <label>
              Joining Date
              <input type="date" formControlName="joiningDate" />
            </label>
            <label>
              Address
              <input type="text" formControlName="address" />
            </label>
            <label>
              Total Trips Completed
              <input type="number" formControlName="totalTripsCompleted" min="0" />
            </label>
            <label class="tp-checkbox">
              <input type="checkbox" formControlName="isActive" />
              Active
            </label>
          </form>
        }
        @case ('attendance') {
          <form [formGroup]="attendanceForm" class="tp-form">
            <label>
              Staff
              <select formControlName="staffProfileId">
                @for (profile of profiles(); track profile.id) {
                  <option [value]="profile.id">{{ profile.employeeCode }}</option>
                }
              </select>
            </label>
            <label>
              Date
              <input type="date" formControlName="attendanceDate" />
            </label>
            <label>
              Status
              <select formControlName="status">
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="OnLeave">On Leave</option>
              </select>
            </label>
            <label>
              Remarks
              <input type="text" formControlName="remarks" />
            </label>
          </form>
        }
        @case ('salary') {
          <form [formGroup]="salaryForm" class="tp-form">
            <label>
              Staff
              <select formControlName="staffProfileId">
                @for (profile of profiles(); track profile.id) {
                  <option [value]="profile.id">{{ profile.employeeCode }}</option>
                }
              </select>
            </label>
            <label>
              Pay Period Start
              <input type="date" formControlName="payPeriodStart" />
            </label>
            <label>
              Pay Period End
              <input type="date" formControlName="payPeriodEnd" />
            </label>
            <label>
              Amount
              <input type="number" formControlName="amount" min="0" step="0.01" />
            </label>
            <label class="tp-checkbox">
              <input type="checkbox" formControlName="isPaid" />
              Paid
            </label>
            <label>
              Payment Reference
              <input type="text" formControlName="paymentReference" />
            </label>
          </form>
        }
      }
      <div modal-footer>
        <button tpButton variant="secondary" (click)="closeModal()">Cancel</button>
        <button tpButton variant="primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save' }}</button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      .tp-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--tp-space-5);
      }

      .tp-toolbar h2 {
        margin: 0;
      }

      .tp-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-md);
      }

      .tp-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      .tp-table th {
        background: var(--tp-bg-soft);
        color: var(--tp-text-muted);
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
        text-align: left;
      }

      .tp-table td {
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
      }

      .tp-table tbody tr:last-child td {
        border-bottom: none;
      }

      .tp-table__actions {
        display: flex;
        gap: var(--tp-space-2);
        justify-content: flex-end;
      }

      .tp-form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
      }

      .tp-form label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-form input,
      .tp-form select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-checkbox {
        flex-direction: row !important;
        align-items: center;
        gap: var(--tp-space-2) !important;
      }
    `,
  ],
})
export class StaffHrComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly staffRoles = STAFF_ROLES;
  protected tabIndex = 0;

  protected readonly loadingProfiles = signal(true);
  protected readonly profiles = signal<StaffProfile[]>([]);
  protected readonly loadingAttendance = signal(true);
  protected readonly attendance = signal<StaffAttendance[]>([]);
  protected readonly loadingSalaries = signal(true);
  protected readonly salaries = signal<StaffSalary[]>([]);

  protected readonly saving = signal(false);
  protected readonly modal = signal<{ kind: ModalKind; editing: string | null } | null>(null);

  protected readonly profileForm = this.fb.nonNullable.group({
    userId: [''],
    busOperatorId: [''],
    employeeCode: ['', Validators.required],
    role: ['CounterStaff' as StaffRole, Validators.required],
    nationalIdNumber: [''],
    joiningDate: [''],
    address: [''],
    totalTripsCompleted: [0, [Validators.required, Validators.min(0)]],
    isActive: [true],
  });

  protected readonly attendanceForm = this.fb.nonNullable.group({
    staffProfileId: ['', Validators.required],
    attendanceDate: ['', Validators.required],
    status: ['Present', Validators.required],
    remarks: [''],
  });

  protected readonly salaryForm = this.fb.nonNullable.group({
    staffProfileId: ['', Validators.required],
    payPeriodStart: ['', Validators.required],
    payPeriodEnd: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    isPaid: [false],
    paymentReference: [''],
  });

  ngOnInit(): void {
    this.refreshProfiles();
    this.refreshAttendance();
    this.refreshSalaries();
  }

  protected profileLabel(staffProfileId: string): string {
    return this.profiles().find((p) => p.id === staffProfileId)?.employeeCode ?? staffProfileId;
  }

  protected modalTitle(): string {
    const m = this.modal();
    if (!m) return '';
    const noun = { profile: 'Staff Profile', attendance: 'Attendance Record', salary: 'Salary Record' }[m.kind];
    return `${m.editing ? 'Edit' : 'New'} ${noun}`;
  }

  // ---- Profiles ---------------------------------------------------------
  protected openProfileCreate(): void {
    this.profileForm.reset({
      userId: '',
      busOperatorId: '',
      employeeCode: '',
      role: 'CounterStaff',
      nationalIdNumber: '',
      joiningDate: '',
      address: '',
      totalTripsCompleted: 0,
      isActive: true,
    });
    this.modal.set({ kind: 'profile', editing: null });
  }

  protected openProfileEdit(profile: StaffProfile): void {
    this.profileForm.reset({
      userId: profile.userId,
      busOperatorId: profile.busOperatorId ?? '',
      employeeCode: profile.employeeCode,
      role: profile.role,
      nationalIdNumber: profile.nationalIdNumber ?? '',
      joiningDate: profile.joiningDate ?? '',
      address: profile.address ?? '',
      totalTripsCompleted: profile.totalTripsCompleted,
      isActive: profile.isActive,
    });
    this.modal.set({ kind: 'profile', editing: profile.id });
  }

  protected deleteProfile(profile: StaffProfile): void {
    if (!confirm(`Delete profile "${profile.employeeCode}"?`)) return;
    this.staffService.deleteProfile(profile.id).subscribe(() => {
      this.toast.success('Profile deleted.');
      this.refreshProfiles();
    });
  }

  // ---- Attendance ---------------------------------------------------------
  protected openAttendanceCreate(): void {
    this.attendanceForm.reset({ staffProfileId: this.profiles()[0]?.id ?? '', attendanceDate: '', status: 'Present', remarks: '' });
    this.modal.set({ kind: 'attendance', editing: null });
  }

  protected openAttendanceEdit(record: StaffAttendance): void {
    this.attendanceForm.reset({
      staffProfileId: record.staffProfileId,
      attendanceDate: record.attendanceDate,
      status: record.status,
      remarks: record.remarks ?? '',
    });
    this.modal.set({ kind: 'attendance', editing: record.id });
  }

  protected deleteAttendance(record: StaffAttendance): void {
    if (!confirm('Delete this attendance record?')) return;
    this.staffService.deleteAttendance(record.id).subscribe(() => {
      this.toast.success('Attendance record deleted.');
      this.refreshAttendance();
    });
  }

  // ---- Salary ---------------------------------------------------------
  protected openSalaryCreate(): void {
    this.salaryForm.reset({
      staffProfileId: this.profiles()[0]?.id ?? '',
      payPeriodStart: '',
      payPeriodEnd: '',
      amount: 0,
      isPaid: false,
      paymentReference: '',
    });
    this.modal.set({ kind: 'salary', editing: null });
  }

  protected openSalaryEdit(salary: StaffSalary): void {
    this.salaryForm.reset({
      staffProfileId: salary.staffProfileId,
      payPeriodStart: salary.payPeriodStart,
      payPeriodEnd: salary.payPeriodEnd,
      amount: salary.amount,
      isPaid: salary.isPaid,
      paymentReference: salary.paymentReference ?? '',
    });
    this.modal.set({ kind: 'salary', editing: salary.id });
  }

  protected deleteSalary(salary: StaffSalary): void {
    if (!confirm('Delete this salary record?')) return;
    this.staffService.deleteSalary(salary.id).subscribe(() => {
      this.toast.success('Salary record deleted.');
      this.refreshSalaries();
    });
  }

  // ---- Shared modal ---------------------------------------------------------
  protected closeModal(): void {
    this.modal.set(null);
  }

  protected save(): void {
    const m = this.modal();
    if (!m) return;

    if (m.kind === 'profile') {
      if (this.profileForm.invalid) return;
      const raw = this.profileForm.getRawValue();
      this.saving.set(true);
      const request$ = m.editing
        ? this.staffService.updateProfile(m.editing, {
            employeeCode: raw.employeeCode,
            role: raw.role,
            nationalIdNumber: raw.nationalIdNumber || undefined,
            joiningDate: raw.joiningDate || undefined,
            address: raw.address || undefined,
            totalTripsCompleted: raw.totalTripsCompleted,
            isActive: raw.isActive,
            rowVersion: this.profiles().find((p) => p.id === m.editing)!.rowVersion,
          })
        : this.staffService.createProfile({
            userId: raw.userId,
            busOperatorId: raw.busOperatorId || undefined,
            employeeCode: raw.employeeCode,
            role: raw.role,
            nationalIdNumber: raw.nationalIdNumber || undefined,
            joiningDate: raw.joiningDate || undefined,
            address: raw.address || undefined,
            totalTripsCompleted: raw.totalTripsCompleted,
            isActive: raw.isActive,
          });
      request$.subscribe({
        next: () => {
          this.toast.success(m.editing ? 'Profile updated.' : 'Profile created.');
          this.saving.set(false);
          this.closeModal();
          this.refreshProfiles();
        },
        error: () => this.saving.set(false),
      });
      return;
    }

    if (m.kind === 'attendance') {
      if (this.attendanceForm.invalid) return;
      const raw = this.attendanceForm.getRawValue();
      this.saving.set(true);
      const request$ = m.editing
        ? this.staffService.updateAttendance(m.editing, {
            attendanceDate: raw.attendanceDate,
            status: raw.status as StaffAttendance['status'],
            remarks: raw.remarks || undefined,
            rowVersion: this.attendance().find((a) => a.id === m.editing)!.rowVersion,
          })
        : this.staffService.createAttendance({
            staffProfileId: raw.staffProfileId,
            attendanceDate: raw.attendanceDate,
            status: raw.status as StaffAttendance['status'],
            remarks: raw.remarks || undefined,
          });
      request$.subscribe({
        next: () => {
          this.toast.success(m.editing ? 'Attendance updated.' : 'Attendance logged.');
          this.saving.set(false);
          this.closeModal();
          this.refreshAttendance();
        },
        error: () => this.saving.set(false),
      });
      return;
    }

    if (m.kind === 'salary') {
      if (this.salaryForm.invalid) return;
      const raw = this.salaryForm.getRawValue();
      this.saving.set(true);
      const request$ = m.editing
        ? this.staffService.updateSalary(m.editing, {
            payPeriodStart: raw.payPeriodStart,
            payPeriodEnd: raw.payPeriodEnd,
            amount: raw.amount,
            isPaid: raw.isPaid,
            paymentReference: raw.paymentReference || undefined,
            rowVersion: this.salaries().find((s) => s.id === m.editing)!.rowVersion,
          })
        : this.staffService.createSalary({
            staffProfileId: raw.staffProfileId,
            payPeriodStart: raw.payPeriodStart,
            payPeriodEnd: raw.payPeriodEnd,
            amount: raw.amount,
            isPaid: raw.isPaid,
            paymentReference: raw.paymentReference || undefined,
          });
      request$.subscribe({
        next: () => {
          this.toast.success(m.editing ? 'Salary record updated.' : 'Salary record created.');
          this.saving.set(false);
          this.closeModal();
          this.refreshSalaries();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  private refreshProfiles(): void {
    this.loadingProfiles.set(true);
    this.staffService.listProfiles().subscribe({
      next: (profiles) => {
        this.profiles.set(profiles);
        this.loadingProfiles.set(false);
      },
      error: () => this.loadingProfiles.set(false),
    });
  }

  private refreshAttendance(): void {
    this.loadingAttendance.set(true);
    this.staffService.listAttendance().subscribe({
      next: (records) => {
        this.attendance.set(records);
        this.loadingAttendance.set(false);
      },
      error: () => this.loadingAttendance.set(false),
    });
  }

  private refreshSalaries(): void {
    this.loadingSalaries.set(true);
    this.staffService.listSalaries().subscribe({
      next: (salaries) => {
        this.salaries.set(salaries);
        this.loadingSalaries.set(false);
      },
      error: () => this.loadingSalaries.set(false),
    });
  }
}

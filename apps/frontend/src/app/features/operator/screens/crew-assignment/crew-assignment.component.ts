import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrewRole, StaffProfile, Trip, TripCrew } from '@ticketportal-mono/models';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpModalComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { CrewService } from '../../services/crew.service';
import { OperatorContextService } from '../../services/operator-context.service';
import { TripsService } from '../../services/trips.service';
import { toDateTimeLocalValue } from '../../../../core/utils/utc';

const CREW_ROLES: CrewRole[] = ['Driver', 'AssistantDriver', 'Supervisor', 'Helper'];

@Component({
  selector: 'tp-crew-assignment',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpModalComponent, TpTableComponent],
  templateUrl: './crew-assignment.component.html',
  styleUrl: './crew-assignment.component.css',
})
export class CrewAssignmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly crewService = inject(CrewService);
  private readonly tripsService = inject(TripsService);
  private readonly ctx = inject(OperatorContextService);
  private readonly toast = inject(ToastService);

  protected readonly crewRoles = CREW_ROLES;

  protected readonly trips = signal<Trip[]>([]);
  protected readonly staff = signal<StaffProfile[]>([]);
  protected readonly selectedTripId = signal<string | null>(null);
  protected readonly crews = signal<TripCrew[]>([]);
  protected readonly saving = signal(false);
  protected readonly assignModalOpen = signal(false);

  protected readonly tripOptions = computed(() =>
    this.trips().map((t) => ({ id: t.id, label: `${t.tripCode} — ${new Date(t.departureTimeUtc).toLocaleString()}` })),
  );

  protected readonly staffLabel = computed(() => {
    const map = new Map(this.staff().map((s) => [s.id, `${s.employeeCode} (${s.role})`]));
    return (id: string) => map.get(id) ?? id;
  });

  protected readonly crewColumns: TpTableColumn[] = [
    { key: 'role', label: 'Crew Role' },
    { key: 'staff', label: 'Staff' },
    { key: 'assignedAtUtc', label: 'Assigned' },
  ];
  protected readonly crewRows = computed(() =>
    this.crews().map((c) => ({
      id: c.id,
      role: c.role,
      staff: this.staffLabel()(c.staffProfileId),
      assignedAtUtc: new Date(c.assignedAtUtc).toLocaleString(),
    })),
  );

  protected readonly assignForm = this.fb.nonNullable.group({
    staffProfileId: ['', Validators.required],
    role: ['Driver' as CrewRole, Validators.required],
    assignedAtUtc: ['', Validators.required],
  });

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe(() => {
      const opId = this.ctx.activeOperatorId();
      if (!opId) return;
      this.tripsService.listTrips(opId).subscribe((trips) => this.trips.set(trips));
      this.crewService.listAssignableStaff().subscribe((s) => this.staff.set(s));
    });
  }

  selectTrip(tripId: string): void {
    this.selectedTripId.set(tripId || null);
    if (tripId) {
      this.crewService.listTripCrews([tripId]).subscribe((crews) => this.crews.set(crews));
    } else {
      this.crews.set([]);
    }
  }

  openAssignModal(): void {
    this.assignForm.reset({ staffProfileId: '', role: 'Driver', assignedAtUtc: toDateTimeLocalValue(new Date().toISOString()) });
    this.assignModalOpen.set(true);
  }

  closeAssignModal(): void {
    this.assignModalOpen.set(false);
  }

  saveAssignment(): void {
    const tripId = this.selectedTripId();
    if (!tripId || this.assignForm.invalid) return;

    const raw = this.assignForm.getRawValue();
    this.saving.set(true);
    this.crewService
      .createAssignment({
        tripId,
        staffProfileId: raw.staffProfileId,
        role: raw.role,
        assignedAtUtc: new Date(raw.assignedAtUtc).toISOString(),
      })
      .subscribe({
        next: () => {
          this.toast.success('Crew assigned.');
          this.saving.set(false);
          this.closeAssignModal();
          this.crewService.listTripCrews([tripId]).subscribe((crews) => this.crews.set(crews));
        },
        error: () => this.saving.set(false),
      });
  }

  removeAssignment(id: unknown): void {
    const tripId = this.selectedTripId();
    if (!tripId || !confirm('Remove this crew assignment?')) return;
    this.crewService.removeAssignment(id as string).subscribe(() => {
      this.toast.success('Assignment removed.');
      this.crewService.listTripCrews([tripId]).subscribe((crews) => this.crews.set(crews));
    });
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Bus,
  BusRoute,
  DAY_OF_WEEK_FLAGS,
  DayOfWeekFlagName,
  Schedule,
  Terminal,
  Trip,
  TripCancelPreview,
  TripCreateRequest,
  TripManifest,
  TripSeatCreateRequest,
  TripStatus,
  TripStatusHistory,
  TripUpdateRequest,
} from '@ticketportal-mono/models';
import { ToastService } from '../../../../core/services/toast.service';
import {
  TpButtonDirective,
  TpCardComponent,
  TpModalComponent,
  TpStatusPillComponent,
  TpTableColumn,
  TpTableComponent,
} from '../../../../shared/ui';
import { BusOperatorProfileService } from '../../services/bus-operator-profile.service';
import { FleetService } from '../../services/fleet.service';
import { NetworkService } from '../../services/network.service';
import { OperatorContextService } from '../../services/operator-context.service';
import { TripsService } from '../../services/trips.service';
import { toDateTimeLocalValue } from '../../../../core/utils/utc';
import { formatMoney } from '../../../finance/shared/money.util';

const TRIP_STATUSES: TripStatus[] = ['Scheduled', 'Boarding', 'Departed', 'Running', 'Arrived', 'Completed', 'Delayed', 'Cancelled'];

@Component({
  selector: 'tp-trips-scheduling',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpModalComponent, TpStatusPillComponent, TpTableComponent],
  templateUrl: './trips-scheduling.component.html',
  styleUrl: './trips-scheduling.component.css',
})
export class TripsSchedulingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tripsService = inject(TripsService);
  private readonly fleet = inject(FleetService);
  private readonly network = inject(NetworkService);
  private readonly profileService = inject(BusOperatorProfileService);
  private readonly ctx = inject(OperatorContextService);
  private readonly toast = inject(ToastService);

  protected readonly tripStatuses = TRIP_STATUSES;
  // Chunk 5: Cancelled is deliberately left out of the edit-modal's Status dropdown — the
  // backend now rejects a direct PUT to Cancelled (it has real side effects: refunding every
  // Confirmed booking, releasing every active seat hold), so the only way there is the
  // dedicated "Cancel trip…" flow below.
  protected readonly editableTripStatuses = TRIP_STATUSES.filter((s) => s !== 'Cancelled');
  protected readonly dayFlags = DAY_OF_WEEK_FLAGS;
  protected readonly formatMoney = formatMoney;

  protected readonly trips = signal<Trip[]>([]);
  protected readonly buses = signal<Bus[]>([]);
  protected readonly busRoutes = signal<BusRoute[]>([]);
  protected readonly terminals = signal<Terminal[]>([]);
  protected readonly schedules = signal<Schedule[]>([]);
  protected readonly selectedTripId = signal<string | null>(null);
  protected readonly statusHistory = signal<TripStatusHistory[]>([]);

  protected readonly saving = signal(false);
  protected readonly tripModalOpen = signal(false);
  protected readonly editingTrip = signal<Trip | null>(null);
  protected readonly scheduleModalOpen = signal(false);
  protected readonly editingSchedule = signal<Schedule | null>(null);

  // --- Chunk 5: cancel-trip confirmation dialog ---
  protected readonly cancelModalOpen = signal(false);
  protected readonly cancellingTrip = signal<Trip | null>(null);
  protected readonly cancelPreview = signal<TripCancelPreview | null>(null);
  protected readonly cancelReason = signal('');
  protected readonly cancelling = signal(false);

  // --- Chunk 5: passenger manifest ---
  protected readonly manifestModalOpen = signal(false);
  protected readonly manifest = signal<TripManifest | null>(null);
  protected readonly manifestColumns: TpTableColumn[] = [
    { key: 'seatNumber', label: 'Seat' },
    { key: 'passengerName', label: 'Passenger' },
    { key: 'passengerPhone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'boardingTerminalName', label: 'Boarding' },
    { key: 'droppingTerminalName', label: 'Dropping' },
  ];
  protected readonly manifestRows = computed(() =>
    (this.manifest()?.passengers ?? []).map((p) => ({
      id: p.ticketId,
      seatNumber: p.seatNumber,
      passengerName: p.passengerName,
      passengerPhone: p.passengerPhone ?? '—',
      status: p.status,
      boardingTerminalName: p.boardingTerminalName,
      droppingTerminalName: p.droppingTerminalName,
    })),
  );

  protected readonly busName = computed(() => {
    const map = new Map(this.buses().map((b) => [b.id, `${b.registrationNumber} (${b.coachNumber})`]));
    return (id: string) => map.get(id) ?? id;
  });
  protected readonly terminalName = computed(() => {
    const map = new Map(this.terminals().map((t) => [t.id, t.name]));
    return (id: string) => map.get(id) ?? id;
  });
  protected readonly busRouteName = computed(() => {
    const map = new Map(this.busRoutes().map((r) => [r.id, r.name]));
    return (id: string) => map.get(id) ?? id;
  });

  protected readonly tripColumns: TpTableColumn[] = [
    { key: 'tripCode', label: 'Trip' },
    { key: 'route', label: 'Route' },
    { key: 'bus', label: 'Bus' },
    { key: 'departure', label: 'Departs' },
  ];
  protected readonly tripRows = computed(() =>
    this.trips().map((t) => ({
      id: t.id,
      tripCode: t.tripCode,
      route: `${this.terminalName()(t.departureTerminalId)} → ${this.terminalName()(t.arrivalTerminalId)}`,
      bus: this.busName()(t.busId),
      departure: new Date(t.departureTimeUtc).toLocaleString(),
      status: t.status,
    })),
  );

  protected readonly selectedTrip = computed(() => this.trips().find((t) => t.id === this.selectedTripId()) ?? null);
  protected readonly historyRows = computed(() =>
    this.statusHistory()
      .slice()
      .sort((a, b) => new Date(b.changedAtUtc).getTime() - new Date(a.changedAtUtc).getTime())
      .map((h) => ({ status: h.status, changedAtUtc: new Date(h.changedAtUtc).toLocaleString(), remarks: h.remarks ?? '' })),
  );
  protected readonly historyColumns: TpTableColumn[] = [
    { key: 'status', label: 'Status' },
    { key: 'changedAtUtc', label: 'When' },
    { key: 'remarks', label: 'Remarks' },
  ];

  protected readonly scheduleColumns: TpTableColumn[] = [
    { key: 'scheduleCode', label: 'Code' },
    { key: 'route', label: 'Route' },
    { key: 'bus', label: 'Bus' },
    { key: 'departureTimeOfDay', label: 'Departs' },
    { key: 'operatingDays', label: 'Days' },
    { key: 'status', label: 'Status' },
  ];
  protected readonly scheduleRows = computed(() =>
    this.schedules().map((s) => ({
      id: s.id,
      scheduleCode: s.scheduleCode,
      route: this.busRouteName()(s.busRouteId),
      bus: this.busName()(s.busId),
      departureTimeOfDay: s.departureTimeOfDay.slice(0, 5),
      operatingDays: s.operatingDays,
      status: s.isActive ? 'Active' : 'Inactive',
    })),
  );

  protected readonly tripForm = this.fb.nonNullable.group({
    busRouteId: ['', Validators.required],
    busId: ['', Validators.required],
    departureTerminalId: ['', Validators.required],
    arrivalTerminalId: ['', Validators.required],
    tripCode: ['', Validators.required],
    departureTimeUtc: ['', Validators.required],
    arrivalTimeUtc: ['', Validators.required],
    baseFare: [0, Validators.required],
    currency: ['BDT', Validators.required],
    isWheelchairAccessible: [false],
    status: ['Scheduled' as TripStatus],
    delayReason: [''],
  });

  protected readonly scheduleForm = this.fb.nonNullable.group({
    busRouteId: ['', Validators.required],
    busId: ['', Validators.required],
    scheduleCode: ['', Validators.required],
    departureTimeOfDay: ['', Validators.required],
    arrivalTimeOfDay: [''],
    days: this.fb.nonNullable.group(
      Object.fromEntries(DAY_OF_WEEK_FLAGS.map((d) => [d, this.fb.nonNullable.control(false)])) as Record<
        (typeof DAY_OF_WEEK_FLAGS)[number],
        ReturnType<FormBuilder['nonNullable']['control']>
      >,
    ),
    effectiveFrom: ['', Validators.required],
    effectiveTo: [''],
    baseFare: [0, Validators.required],
    currency: ['BDT', Validators.required],
    isActive: [true],
  });

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe(() => {
      const opId = this.ctx.activeOperatorId();
      if (!opId) return;
      this.loadTrips();
      this.fleet.listBuses(opId).subscribe((b) => this.buses.set(b));
      this.profileService.listBusRoutes().subscribe((r) => this.busRoutes.set(r));
      this.network.listTerminals().subscribe((t) => this.terminals.set(t));
      this.loadSchedules();
    });
  }

  private loadTrips(): void {
    const opId = this.ctx.activeOperatorId();
    if (!opId) return;
    this.tripsService.listTrips(opId).subscribe((trips) => this.trips.set(trips));
  }

  private loadSchedules(): void {
    const opId = this.ctx.activeOperatorId();
    if (!opId) return;
    this.tripsService.listSchedules(opId).subscribe((s) => this.schedules.set(s));
  }

  selectTrip(id: unknown): void {
    const tripId = id as string;
    this.selectedTripId.set(tripId);
    this.tripsService.listStatusHistory(tripId).subscribe((h) => this.statusHistory.set(h));
  }

  // --- Trip create/edit ---

  findTrip(id: unknown): Trip | null {
    return this.trips().find((t) => t.id === id) ?? null;
  }

  openTripModal(trip: Trip | null = null): void {
    this.editingTrip.set(trip);
    this.tripForm.reset(
      trip
        ? {
            busRouteId: trip.busRouteId,
            busId: trip.busId,
            departureTerminalId: trip.departureTerminalId,
            arrivalTerminalId: trip.arrivalTerminalId,
            tripCode: trip.tripCode,
            departureTimeUtc: toDateTimeLocalValue(trip.departureTimeUtc),
            arrivalTimeUtc: toDateTimeLocalValue(trip.arrivalTimeUtc),
            baseFare: trip.baseFare,
            currency: trip.currency,
            isWheelchairAccessible: trip.isWheelchairAccessible,
            status: trip.status,
            delayReason: trip.delayReason ?? '',
          }
        : {
            busRouteId: '',
            busId: '',
            departureTerminalId: '',
            arrivalTerminalId: '',
            tripCode: '',
            departureTimeUtc: '',
            arrivalTimeUtc: '',
            baseFare: 0,
            currency: 'BDT',
            isWheelchairAccessible: false,
            status: 'Scheduled',
            delayReason: '',
          },
    );
    this.tripModalOpen.set(true);
  }

  closeTripModal(): void {
    this.tripModalOpen.set(false);
    this.editingTrip.set(null);
  }

  saveTrip(): void {
    const operatorId = this.ctx.activeOperatorId();
    if (!operatorId || this.tripForm.invalid) return;

    const raw = this.tripForm.getRawValue();
    const existing = this.editingTrip();
    this.saving.set(true);

    const base: TripCreateRequest = {
      busOperatorId: operatorId,
      busRouteId: raw.busRouteId,
      busId: raw.busId,
      departureTerminalId: raw.departureTerminalId,
      arrivalTerminalId: raw.arrivalTerminalId,
      tripCode: raw.tripCode,
      departureTimeUtc: new Date(raw.departureTimeUtc).toISOString(),
      arrivalTimeUtc: new Date(raw.arrivalTimeUtc).toISOString(),
      baseFare: raw.baseFare,
      currency: raw.currency,
      isWheelchairAccessible: raw.isWheelchairAccessible,
      // New trip: seed every seat on the picked bus as available at baseFare (+ any per-seat
      // extraFare). Editing an existing trip: resend its seats untouched — the seat map is set
      // at creation and shouldn't be silently rewritten by a scalar-field edit here (see
      // trip.model.ts's TripUpdateRequest doc-comment).
      tripSeats: existing
        ? existing.tripSeats.map<TripSeatCreateRequest>((s) => ({ seatId: s.seatId, seatNumber: s.seatNumber, seatType: s.seatType, fare: s.fare }))
        : this.seedSeatsFromBus(raw.busId, raw.baseFare),
    };

    const done = () => {
      this.saving.set(false);
      this.closeTripModal();
      this.loadTrips();
    };

    if (existing) {
      const dto: TripUpdateRequest = { ...base, status: raw.status, delayReason: raw.delayReason || null, rowVersion: existing.rowVersion };
      this.tripsService.updateTrip(existing.id, dto).subscribe({
        next: () => {
          this.toast.success('Trip updated.');
          done();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.tripsService.createTrip(base).subscribe({
        next: () => {
          this.toast.success('Trip created.');
          done();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  private seedSeatsFromBus(busId: string, baseFare: number): TripSeatCreateRequest[] {
    const bus = this.buses().find((b) => b.id === busId);
    if (!bus) return [];
    return bus.seats.map((seat) => ({
      seatId: seat.id,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      fare: baseFare + (seat.extraFare ?? 0),
    }));
  }

  deleteTrip(id: unknown): void {
    const trip = this.findTrip(id);
    if (!trip || !confirm(`Delete trip "${trip.tripCode}"?`)) return;
    this.tripsService.deleteTrip(trip.id).subscribe(() => {
      this.toast.success('Trip deleted.');
      if (this.selectedTripId() === trip.id) this.selectedTripId.set(null);
      this.loadTrips();
    });
  }

  /** Quick status-change action — resends the trip unchanged except status/delayReason; the
   * backend logs the TripStatusHistory row automatically. */
  changeStatus(trip: Trip, status: TripStatus): void {
    let delayReason = trip.delayReason;
    if (status === 'Delayed') {
      delayReason = prompt('Reason for the delay?', trip.delayReason ?? '') ?? trip.delayReason;
    }

    const dto: TripUpdateRequest = {
      busOperatorId: trip.busOperatorId,
      busRouteId: trip.busRouteId,
      busId: trip.busId,
      departureTerminalId: trip.departureTerminalId,
      arrivalTerminalId: trip.arrivalTerminalId,
      tripCode: trip.tripCode,
      departureTimeUtc: trip.departureTimeUtc,
      arrivalTimeUtc: trip.arrivalTimeUtc,
      baseFare: trip.baseFare,
      currency: trip.currency,
      isWheelchairAccessible: trip.isWheelchairAccessible,
      tripSeats: trip.tripSeats.map((s) => ({ seatId: s.seatId, seatNumber: s.seatNumber, seatType: s.seatType, fare: s.fare })),
      status,
      delayReason,
      rowVersion: trip.rowVersion,
    };

    this.tripsService.updateTrip(trip.id, dto).subscribe(() => {
      this.toast.success(`Trip marked ${status}.`);
      this.loadTrips();
      if (this.selectedTripId() === trip.id) {
        this.tripsService.listStatusHistory(trip.id).subscribe((h) => this.statusHistory.set(h));
      }
    });
  }

  /** Chunk 5: the ONLY way a trip gets cancelled from this screen now — opens the confirmation
   * dialog and loads its "N bookings will be refunded" preview. changeStatus() above can no
   * longer be called with 'Cancelled'; the backend rejects that PUT outright. */
  openCancelModal(trip: Trip): void {
    this.cancellingTrip.set(trip);
    this.cancelReason.set('');
    this.cancelPreview.set(null);
    this.cancelModalOpen.set(true);
    this.tripsService.previewCancelTrip(trip.id).subscribe((preview) => this.cancelPreview.set(preview));
  }

  closeCancelModal(): void {
    this.cancelModalOpen.set(false);
    this.cancellingTrip.set(null);
    this.cancelPreview.set(null);
  }

  onCancelReasonInput(value: string): void {
    this.cancelReason.set(value);
  }

  confirmCancelTrip(): void {
    const trip = this.cancellingTrip();
    const reason = this.cancelReason().trim();
    if (!trip || reason.length < 3) return;

    this.cancelling.set(true);
    this.tripsService.cancelTrip(trip.id, { reason }).subscribe({
      next: ({ message }) => {
        this.cancelling.set(false);
        this.toast.success(message);
        this.closeCancelModal();
        this.loadTrips();
        if (this.selectedTripId() === trip.id) {
          this.tripsService.listStatusHistory(trip.id).subscribe((h) => this.statusHistory.set(h));
        }
      },
      error: () => this.cancelling.set(false),
    });
  }

  /** Chunk 5: driver/conductor boarding list for one trip. */
  openManifestModal(trip: Trip): void {
    this.manifest.set(null);
    this.manifestModalOpen.set(true);
    this.tripsService.getManifest(trip.id).subscribe((m) => this.manifest.set(m));
  }

  closeManifestModal(): void {
    this.manifestModalOpen.set(false);
    this.manifest.set(null);
  }

  onCoverImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const tripId = this.selectedTripId();
    if (!file || !tripId) return;
    this.tripsService.uploadTripCoverImage(tripId, file).subscribe(() => {
      this.toast.success('Cover photo updated.');
      this.loadTrips();
    });
  }

  // --- Schedules ---

  findSchedule(id: unknown): Schedule | null {
    return this.schedules().find((s) => s.id === id) ?? null;
  }

  openScheduleModal(schedule: Schedule | null = null): void {
    this.editingSchedule.set(schedule);
    const dayValues = Object.fromEntries(DAY_OF_WEEK_FLAGS.map((d) => [d, schedule ? scheduleHasDay(schedule.operatingDays, d) : false]));
    this.scheduleForm.reset({
      busRouteId: schedule?.busRouteId ?? '',
      busId: schedule?.busId ?? '',
      scheduleCode: schedule?.scheduleCode ?? '',
      departureTimeOfDay: schedule ? schedule.departureTimeOfDay.slice(0, 5) : '',
      arrivalTimeOfDay: schedule?.arrivalTimeOfDay ? schedule.arrivalTimeOfDay.slice(0, 5) : '',
      effectiveFrom: schedule?.effectiveFrom ?? '',
      effectiveTo: schedule?.effectiveTo ?? '',
      baseFare: schedule?.baseFare ?? 0,
      currency: schedule?.currency ?? 'BDT',
      isActive: schedule?.isActive ?? true,
    });
    this.scheduleForm.controls.days.patchValue(dayValues);
    this.scheduleModalOpen.set(true);
  }

  closeScheduleModal(): void {
    this.scheduleModalOpen.set(false);
    this.editingSchedule.set(null);
  }

  saveSchedule(): void {
    const operatorId = this.ctx.activeOperatorId();
    if (!operatorId || this.scheduleForm.invalid) return;

    const raw = this.scheduleForm.getRawValue();
    const operatingDays = DAY_OF_WEEK_FLAGS.filter((d) => raw.days[d]).join(', ') || 'None';
    const existing = this.editingSchedule();

    const dto = {
      busOperatorId: operatorId,
      busRouteId: raw.busRouteId,
      busId: raw.busId,
      scheduleCode: raw.scheduleCode,
      departureTimeOfDay: `${raw.departureTimeOfDay}:00`,
      arrivalTimeOfDay: raw.arrivalTimeOfDay ? `${raw.arrivalTimeOfDay}:00` : null,
      operatingDays,
      effectiveFrom: raw.effectiveFrom,
      effectiveTo: raw.effectiveTo || null,
      baseFare: raw.baseFare,
      currency: raw.currency,
      isActive: raw.isActive,
    };

    const done = () => {
      this.closeScheduleModal();
      this.loadSchedules();
    };

    if (existing) {
      this.tripsService.updateSchedule(existing.id, { ...dto, rowVersion: existing.rowVersion }).subscribe(() => {
        this.toast.success('Schedule updated.');
        done();
      });
    } else {
      this.tripsService.createSchedule(dto).subscribe(() => {
        this.toast.success('Schedule created.');
        done();
      });
    }
  }

  deleteSchedule(id: unknown): void {
    const schedule = this.findSchedule(id);
    if (!schedule || !confirm(`Delete schedule "${schedule.scheduleCode}"?`)) return;
    this.tripsService.deleteSchedule(schedule.id).subscribe(() => {
      this.toast.success('Schedule deleted.');
      this.loadSchedules();
    });
  }
}

function scheduleHasDay(operatingDays: string, day: DayOfWeekFlagName): boolean {
  if (operatingDays === 'Everyday') return true;
  return operatingDays
    .split(',')
    .map((d) => d.trim())
    .includes(day);
}

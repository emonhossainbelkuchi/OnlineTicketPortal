import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BusRoute,
  OperatorInventoryMode,
  OperatorRoute,
  OperatorRouteStop,
  OperatorRouteUpdateRequest,
  RouteStop,
  Terminal,
} from '@ticketportal-mono/models';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpModalComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { BusOperatorProfileService } from '../../services/bus-operator-profile.service';
import { NetworkService } from '../../services/network.service';
import { OperatorContextService } from '../../services/operator-context.service';

const INVENTORY_OVERRIDES: (OperatorInventoryMode | '')[] = ['', 'PlatformManaged', 'ExternalApiManaged', 'Hybrid'];

@Component({
  selector: 'tp-network-setup',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpModalComponent, TpTableComponent],
  templateUrl: './network-setup.component.html',
  styleUrl: './network-setup.component.css',
})
export class NetworkSetupComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly network = inject(NetworkService);
  private readonly profileService = inject(BusOperatorProfileService);
  private readonly ctx = inject(OperatorContextService);
  private readonly toast = inject(ToastService);

  protected readonly inventoryOverrides = INVENTORY_OVERRIDES;

  protected readonly terminals = signal<Terminal[]>([]);
  protected readonly busRoutes = signal<BusRoute[]>([]);
  protected readonly selectedBusRouteId = signal<string | null>(null);
  protected readonly routeStops = signal<RouteStop[]>([]);
  protected readonly operatorRouteStops = signal<OperatorRouteStop[]>([]);
  protected readonly selectedOperatorRouteId = signal<string | null>(null);

  protected readonly saving = signal(false);
  protected readonly routeModalOpen = signal(false);
  protected readonly editingRoute = signal<OperatorRoute | null>(null);
  protected readonly stopModalOpen = signal(false);
  protected readonly editingStop = signal<OperatorRouteStop | null>(null);

  protected readonly operatorRoutes = computed(() => this.ctx.activeOperator()?.operatorRoutes ?? []);
  protected readonly terminalName = computed(() => {
    const map = new Map(this.terminals().map((t) => [t.id, `${t.name} (${t.code})`]));
    return (id: string) => map.get(id) ?? id;
  });
  protected readonly busRouteName = computed(() => {
    const map = new Map(this.busRoutes().map((r) => [r.id, r.name]));
    return (id: string) => map.get(id) ?? id;
  });

  protected readonly terminalColumns: TpTableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'city', label: 'City' },
    { key: 'district', label: 'District' },
  ];
  protected readonly terminalRows = computed(() =>
    this.terminals().map((t) => ({ id: t.id, name: t.name, code: t.code, city: t.city, district: t.district })),
  );

  protected readonly busRouteColumns: TpTableColumn[] = [
    { key: 'routeCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'distanceKm', label: 'Distance (km)', align: 'right' },
    { key: 'estimatedDurationMinutes', label: 'Duration (min)', align: 'right' },
  ];
  protected readonly busRouteRows = computed(() =>
    this.busRoutes().map((r) => ({
      id: r.id,
      routeCode: r.routeCode,
      name: r.name,
      distanceKm: r.distanceKm,
      estimatedDurationMinutes: r.estimatedDurationMinutes,
    })),
  );

  protected readonly routeStopColumns: TpTableColumn[] = [
    { key: 'stopOrder', label: 'Order', align: 'right' },
    { key: 'terminal', label: 'Terminal' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'dropOff', label: 'Drop-off' },
  ];
  protected readonly routeStopRows = computed(() =>
    this.routeStops()
      .slice()
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((s) => ({
        stopOrder: s.stopOrder,
        terminal: this.terminalName()(s.terminalId),
        pickup: s.isPickupPoint ? 'Yes' : '',
        dropOff: s.isDropOffPoint ? 'Yes' : '',
      })),
  );

  protected readonly operatorRouteColumns: TpTableColumn[] = [
    { key: 'operatorRouteCode', label: 'Code' },
    { key: 'displayName', label: 'Display name' },
    { key: 'busRoute', label: 'Unified route' },
    { key: 'status', label: 'Status' },
  ];
  protected readonly operatorRouteRows = computed(() =>
    this.operatorRoutes().map((r) => ({
      id: r.id,
      operatorRouteCode: r.operatorRouteCode,
      displayName: r.displayName ?? '—',
      busRoute: this.busRouteName()(r.busRouteId),
      status: r.isActive ? 'Active' : 'Inactive',
    })),
  );

  protected readonly operatorRouteStopColumns: TpTableColumn[] = [
    { key: 'stopOrder', label: 'Order', align: 'right' },
    { key: 'terminal', label: 'Terminal' },
    { key: 'pickup', label: 'Pickup' },
    { key: 'dropOff', label: 'Drop-off' },
  ];
  protected readonly operatorRouteStopRows = computed(() =>
    this.operatorRouteStops()
      .slice()
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((s) => ({
        id: s.id,
        stopOrder: s.stopOrder,
        terminal: this.terminalName()(s.terminalId),
        pickup: s.isPickupPoint ? 'Yes' : '',
        dropOff: s.isDropOffPoint ? 'Yes' : '',
      })),
  );

  protected readonly routeForm = this.fb.nonNullable.group({
    busRouteId: ['', Validators.required],
    operatorRouteCode: ['', Validators.required],
    displayName: [''],
    inventoryModeOverride: ['' as OperatorInventoryMode | ''],
    isActive: [true],
  });

  protected readonly stopForm = this.fb.nonNullable.group({
    terminalId: ['', Validators.required],
    stopOrder: [1, Validators.required],
    arrivalOffsetMinutes: [null as number | null],
    departureOffsetMinutes: [null as number | null],
    isPickupPoint: [true],
    isDropOffPoint: [true],
    externalStopKey: [''],
  });

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe(() => {
      this.network.listTerminals().subscribe((t) => this.terminals.set(t));
      this.profileService.listBusRoutes().subscribe((r) => this.busRoutes.set(r));
      this.loadOperatorRouteStops();
    });
  }

  private loadOperatorRouteStops(): void {
    const ids = this.operatorRoutes().map((r) => r.id);
    if (ids.length === 0) {
      this.operatorRouteStops.set([]);
      return;
    }
    this.network.listOperatorRouteStops(ids).subscribe((stops) => this.operatorRouteStops.set(stops));
  }

  viewRouteStops(busRouteId: string): void {
    this.selectedBusRouteId.set(busRouteId || null);
    if (busRouteId) {
      this.network.listRouteStops(busRouteId).subscribe((stops) => this.routeStops.set(stops));
    } else {
      this.routeStops.set([]);
    }
  }

  // --- Operator Routes (which unified routes this operator serves) ---

  findOperatorRoute(id: unknown): OperatorRoute | null {
    return this.operatorRoutes().find((r) => r.id === id) ?? null;
  }

  openRouteModal(route: OperatorRoute | null = null): void {
    this.editingRoute.set(route);
    this.routeForm.reset(
      route
        ? {
            busRouteId: route.busRouteId,
            operatorRouteCode: route.operatorRouteCode,
            displayName: route.displayName ?? '',
            inventoryModeOverride: route.inventoryModeOverride ?? '',
            isActive: route.isActive,
          }
        : { busRouteId: '', operatorRouteCode: '', displayName: '', inventoryModeOverride: '', isActive: true },
    );
    this.routeModalOpen.set(true);
  }

  closeRouteModal(): void {
    this.routeModalOpen.set(false);
    this.editingRoute.set(null);
  }

  saveRoute(): void {
    const op = this.ctx.activeOperator();
    if (!op || this.routeForm.invalid) return;

    const raw = this.routeForm.getRawValue();
    const editing = this.editingRoute();

    // Keep every OTHER route exactly as loaded — the PUT replaces the whole array, and only the
    // route being added/edited should change.
    const untouched: OperatorRouteUpdateRequest[] = op.operatorRoutes
      .filter((r) => r.id !== editing?.id)
      .map((r) => ({
        id: r.id,
        busRouteId: r.busRouteId,
        operatorRouteCode: r.operatorRouteCode,
        displayName: r.displayName,
        inventoryModeOverride: r.inventoryModeOverride,
        isActive: r.isActive,
        rowVersion: r.rowVersion,
      }));

    const edited: OperatorRouteUpdateRequest = {
      id: editing?.id,
      busRouteId: raw.busRouteId,
      operatorRouteCode: raw.operatorRouteCode,
      displayName: raw.displayName || null,
      inventoryModeOverride: raw.inventoryModeOverride || null,
      isActive: raw.isActive,
      rowVersion: editing?.rowVersion,
    };

    this.saving.set(true);
    const request = this.profileService.buildUpdateRequestFrom(op, [...untouched, edited]);
    this.profileService.updateOperator(op.id, request).subscribe({
      next: () => {
        this.toast.success(editing ? 'Route updated.' : 'Route added.');
        this.ctx.refreshActiveOperator().subscribe(() => this.loadOperatorRouteStops());
        this.saving.set(false);
        this.closeRouteModal();
      },
      error: () => this.saving.set(false),
    });
  }

  deleteRoute(route: OperatorRoute | null): void {
    const op = this.ctx.activeOperator();
    if (!op || !route) return;
    if (!confirm(`Remove operator route "${route.operatorRouteCode}"? Any of its route stops will also be orphaned.`)) return;

    const remaining: OperatorRouteUpdateRequest[] = op.operatorRoutes
      .filter((r) => r.id !== route.id)
      .map((r) => ({
        id: r.id,
        busRouteId: r.busRouteId,
        operatorRouteCode: r.operatorRouteCode,
        displayName: r.displayName,
        inventoryModeOverride: r.inventoryModeOverride,
        isActive: r.isActive,
        rowVersion: r.rowVersion,
      }));

    this.profileService.updateOperator(op.id, this.profileService.buildUpdateRequestFrom(op, remaining)).subscribe({
      next: () => {
        this.toast.success('Route removed.');
        this.ctx.refreshActiveOperator().subscribe(() => this.loadOperatorRouteStops());
      },
    });
  }

  // --- Operator Route Stops (this operator's own boarding/dropping points) ---

  selectOperatorRoute(operatorRouteId: string): void {
    this.selectedOperatorRouteId.set(operatorRouteId || null);
  }

  visibleOperatorRouteStopRows(): { id: unknown; stopOrder: number; terminal: string; pickup: string; dropOff: string }[] {
    const routeId = this.selectedOperatorRouteId();
    if (!routeId) return [];
    return this.operatorRouteStopRows().filter((row) => {
      const stop = this.operatorRouteStops().find((s) => s.id === row.id);
      return stop?.operatorRouteId === routeId;
    });
  }

  openStopModal(stop: OperatorRouteStop | null = null): void {
    this.editingStop.set(stop);
    this.stopForm.reset(
      stop
        ? {
            terminalId: stop.terminalId,
            stopOrder: stop.stopOrder,
            arrivalOffsetMinutes: stop.arrivalOffsetMinutes,
            departureOffsetMinutes: stop.departureOffsetMinutes,
            isPickupPoint: stop.isPickupPoint,
            isDropOffPoint: stop.isDropOffPoint,
            externalStopKey: stop.externalStopKey ?? '',
          }
        : { terminalId: '', stopOrder: 1, arrivalOffsetMinutes: null, departureOffsetMinutes: null, isPickupPoint: true, isDropOffPoint: true, externalStopKey: '' },
    );
    this.stopModalOpen.set(true);
  }

  closeStopModal(): void {
    this.stopModalOpen.set(false);
    this.editingStop.set(null);
  }

  saveStop(): void {
    const operatorRouteId = this.selectedOperatorRouteId();
    if (!operatorRouteId || this.stopForm.invalid) return;

    const raw = this.stopForm.getRawValue();
    const dto = {
      operatorRouteId,
      terminalId: raw.terminalId,
      stopOrder: raw.stopOrder,
      arrivalOffsetMinutes: raw.arrivalOffsetMinutes,
      departureOffsetMinutes: raw.departureOffsetMinutes,
      isPickupPoint: raw.isPickupPoint,
      isDropOffPoint: raw.isDropOffPoint,
      externalStopKey: raw.externalStopKey || null,
    };
    const existing = this.editingStop();

    const done = () => {
      this.closeStopModal();
      this.loadOperatorRouteStops();
    };

    if (existing) {
      this.network.updateOperatorRouteStop(existing.id, { ...dto, rowVersion: existing.rowVersion }).subscribe(() => {
        this.toast.success('Stop updated.');
        done();
      });
    } else {
      this.network.createOperatorRouteStop(dto).subscribe(() => {
        this.toast.success('Stop added.');
        done();
      });
    }
  }

  findOperatorRouteStop(id: unknown): OperatorRouteStop | null {
    return this.operatorRouteStops().find((s) => s.id === id) ?? null;
  }

  deleteStop(id: unknown): void {
    const stop = this.findOperatorRouteStop(id);
    if (!stop || !confirm('Remove this stop?')) return;
    this.network.deleteOperatorRouteStop(stop.id).subscribe(() => {
      this.toast.success('Stop removed.');
      this.loadOperatorRouteStops();
    });
  }
}

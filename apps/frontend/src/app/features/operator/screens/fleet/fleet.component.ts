import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Bus,
  BusAmenity,
  BusAmenityMapping,
  BusCategory,
  BusCreateRequest,
  BusImage,
  BusMaintenanceLog,
  BusType,
  DriverLicense,
  LicenseType,
  Seat,
  SeatType,
  StaffProfile,
} from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpModalComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { FleetService } from '../../services/fleet.service';
import { OperatorContextService } from '../../services/operator-context.service';

const BUS_TYPES: BusType[] = ['NonAc', 'Ac', 'Sleeper', 'DoubleDecker', 'BusinessClass', 'Economy', 'Luxury'];
const SEAT_TYPES: SeatType[] = ['Regular', 'Window', 'Aisle', 'Middle', 'Sleeper', 'Business'];
const LICENSE_TYPES: LicenseType[] = ['Light', 'Heavy', 'Commercial'];

@Component({
  selector: 'tp-fleet',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpModalComponent, TpTableComponent],
  templateUrl: './fleet.component.html',
  styleUrl: './fleet.component.css',
})
export class FleetComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly fleet = inject(FleetService);
  private readonly ctx = inject(OperatorContextService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly busTypes = BUS_TYPES;
  protected readonly seatTypes = SEAT_TYPES;
  protected readonly licenseTypes = LICENSE_TYPES;

  protected readonly buses = signal<Bus[]>([]);
  protected readonly categories = signal<BusCategory[]>([]);
  protected readonly amenities = signal<BusAmenity[]>([]);
  protected readonly selectedBusId = signal<string | null>(null);
  protected readonly selectedBusAmenities = signal<BusAmenityMapping[]>([]);
  protected readonly images = signal<BusImage[]>([]);
  protected readonly maintenanceLogs = signal<BusMaintenanceLog[]>([]);
  protected readonly drivers = signal<StaffProfile[]>([]);
  protected readonly selectedDriverId = signal<string | null>(null);
  protected readonly driverLicenses = signal<DriverLicense[]>([]);

  protected readonly saving = signal(false);
  protected readonly uploadingCover = signal(false);
  protected readonly busModalOpen = signal(false);
  protected readonly editingBus = signal<Bus | null>(null);
  protected readonly imageModalOpen = signal(false);
  protected readonly editingImage = signal<BusImage | null>(null);
  protected readonly logModalOpen = signal(false);
  protected readonly editingLog = signal<BusMaintenanceLog | null>(null);
  protected readonly licenseModalOpen = signal(false);
  protected readonly editingLicense = signal<DriverLicense | null>(null);

  protected readonly selectedBus = computed(() => this.buses().find((b) => b.id === this.selectedBusId()) ?? null);
  protected readonly selectedBusCoverUrl = computed(() => this.api.resolveAssetUrl(this.selectedBus()?.primaryImageUrl));
  protected readonly categoryName = computed(() => {
    const map = new Map(this.categories().map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? 'Unknown' : '—');
  });
  protected readonly amenityName = computed(() => {
    const map = new Map(this.amenities().map((a) => [a.id, a.name]));
    return (id: string) => map.get(id) ?? 'Unknown';
  });

  protected readonly busColumns: TpTableColumn[] = [
    { key: 'registrationNumber', label: 'Registration' },
    { key: 'coachNumber', label: 'Coach #' },
    { key: 'busType', label: 'Type' },
    { key: 'totalSeats', label: 'Seats', align: 'right' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
  ];

  protected readonly busRows = computed(() =>
    this.buses().map((b) => ({
      id: b.id,
      registrationNumber: b.registrationNumber,
      coachNumber: b.coachNumber,
      busType: b.busType,
      totalSeats: b.totalSeats,
      category: this.categoryName()(b.busCategoryId),
      status: b.isActive ? 'Active' : 'Inactive',
    })),
  );

  protected readonly imageColumns: TpTableColumn[] = [
    { key: 'caption', label: 'Caption' },
    { key: 'displayOrder', label: 'Order', align: 'right' },
    { key: 'primary', label: 'Primary' },
  ];
  protected readonly imageRows = computed(() =>
    this.images().map((i) => ({ id: i.id, caption: i.caption ?? '(none)', displayOrder: i.displayOrder, primary: i.isPrimary ? 'Yes' : '' })),
  );

  protected readonly logColumns: TpTableColumn[] = [
    { key: 'maintenanceDateUtc', label: 'Date' },
    { key: 'title', label: 'Title' },
    { key: 'cost', label: 'Cost', align: 'right' },
    { key: 'nextDueDateUtc', label: 'Next Due' },
  ];
  protected readonly logRows = computed(() =>
    this.maintenanceLogs().map((l) => ({
      id: l.id,
      maintenanceDateUtc: l.maintenanceDateUtc.slice(0, 10),
      title: l.title,
      cost: l.cost,
      nextDueDateUtc: l.nextDueDateUtc ? l.nextDueDateUtc.slice(0, 10) : '—',
    })),
  );

  protected readonly licenseColumns: TpTableColumn[] = [
    { key: 'licenseNumber', label: 'License #' },
    { key: 'type', label: 'Type' },
    { key: 'issueDate', label: 'Issued' },
    { key: 'expiryDate', label: 'Expires' },
  ];
  protected readonly licenseRows = computed(() =>
    this.driverLicenses().map((l) => ({ id: l.id, licenseNumber: l.licenseNumber, type: l.type, issueDate: l.issueDate, expiryDate: l.expiryDate })),
  );

  protected readonly busForm = this.fb.nonNullable.group({
    registrationNumber: ['', Validators.required],
    coachNumber: ['', Validators.required],
    busCategoryId: [''],
    brand: [''],
    model: [''],
    registrationDate: [''],
    busType: ['NonAc' as BusType, Validators.required],
    hasWifi: [false],
    hasToilet: [false],
    seats: this.fb.array<ReturnType<FleetComponent['buildSeatGroup']>>([]),
  });

  protected readonly imageForm = this.fb.nonNullable.group({
    imageUrl: ['', Validators.required],
    caption: [''],
    isPrimary: [false],
    displayOrder: [0],
  });

  protected readonly logForm = this.fb.nonNullable.group({
    maintenanceDateUtc: ['', Validators.required],
    odometerKm: [null as number | null],
    title: ['', Validators.required],
    description: [''],
    cost: [0, Validators.required],
    nextDueDateUtc: [''],
    performedBy: [''],
  });

  protected readonly licenseForm = this.fb.nonNullable.group({
    licenseNumber: ['', Validators.required],
    type: ['Light' as LicenseType, Validators.required],
    issueDate: ['', Validators.required],
    expiryDate: ['', Validators.required],
  });

  private buildSeatGroup(seat?: Partial<Seat>) {
    return this.fb.nonNullable.group({
      seatId: [seat?.id ?? ''],
      seatNumber: [seat?.seatNumber ?? '', Validators.required],
      rowNumber: [seat?.rowNumber ?? 1, Validators.required],
      columnNumber: [seat?.columnNumber ?? 1, Validators.required],
      deckLevel: [seat?.deckLevel ?? 1, Validators.required],
      seatType: [(seat?.seatType ?? 'Regular') as SeatType, Validators.required],
      isWindow: [seat?.isWindow ?? false],
      extraFare: [seat?.extraFare ?? null],
    });
  }

  get seatControls() {
    return this.busForm.controls.seats.controls;
  }

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe(() => {
      this.loadBuses();
      this.fleet.listCategories().subscribe((c) => this.categories.set(c));
      this.fleet.listAmenities().subscribe((a) => this.amenities.set(a));
      const opId = this.ctx.activeOperatorId();
      if (opId) this.fleet.listDrivers(opId).subscribe((d) => this.drivers.set(d));
    });
  }

  private loadBuses(): void {
    const id = this.ctx.activeOperatorId();
    if (!id) return;
    this.fleet.listBuses(id).subscribe((buses) => this.buses.set(buses));
  }

  selectBus(busId: unknown): void {
    const id = busId as string;
    this.selectedBusId.set(id);
    this.fleet.listAmenityMappings(id).subscribe((m) => this.selectedBusAmenities.set(m));
    this.fleet.listImages(id).subscribe((i) => this.images.set(i));
    this.fleet.listMaintenanceLogs(id).subscribe((l) => this.maintenanceLogs.set(l));
  }

  // --- Bus create/edit ---

  addSeatRow(): void {
    this.busForm.controls.seats.push(this.buildSeatGroup());
  }

  removeSeatRow(index: number): void {
    this.busForm.controls.seats.removeAt(index);
  }

  /** Fills the seat array with a simple rows x columns grid (2 seats, aisle, 2 seats per row) so
   * a new bus doesn't have to be built one seat at a time. */
  generateSeatGrid(): void {
    const rows = Number(prompt('Number of rows?', '10')) || 0;
    if (rows <= 0) return;
    const seatsArray = this.busForm.controls.seats;
    while (seatsArray.length) seatsArray.removeAt(0);

    const letters = ['A', 'B', 'C', 'D'];
    const deck = 1;
    for (let r = 1; r <= rows; r++) {
      letters.forEach((letter, colIndex) => {
        seatsArray.push(
          this.buildSeatGroup({
            id: '',
            seatNumber: `${r}${letter}`,
            rowNumber: r,
            columnNumber: colIndex + 1,
            deckLevel: deck,
            seatType: colIndex === 0 || colIndex === letters.length - 1 ? 'Window' : 'Aisle',
            isWindow: colIndex === 0 || colIndex === letters.length - 1,
            extraFare: null,
          }),
        );
      });
    }
  }

  openBusModal(bus: Bus | null = null): void {
    this.editingBus.set(bus);
    const seatsArray = this.busForm.controls.seats;
    while (seatsArray.length) seatsArray.removeAt(0);

    if (bus) {
      this.busForm.patchValue({
        registrationNumber: bus.registrationNumber,
        coachNumber: bus.coachNumber,
        busCategoryId: bus.busCategoryId ?? '',
        brand: bus.brand ?? '',
        model: bus.model ?? '',
        registrationDate: bus.registrationDate ? bus.registrationDate.slice(0, 10) : '',
        busType: bus.busType,
        hasWifi: bus.hasWifi,
        hasToilet: bus.hasToilet,
      });
      bus.seats.forEach((seat) => seatsArray.push(this.buildSeatGroup(seat)));
    } else {
      this.busForm.reset({
        registrationNumber: '',
        coachNumber: '',
        busCategoryId: '',
        brand: '',
        model: '',
        registrationDate: '',
        busType: 'NonAc',
        hasWifi: false,
        hasToilet: false,
      });
    }
    this.busModalOpen.set(true);
  }

  closeBusModal(): void {
    this.busModalOpen.set(false);
    this.editingBus.set(null);
  }

  saveBus(): void {
    const operatorId = this.ctx.activeOperatorId();
    if (!operatorId || this.busForm.invalid || this.seatControls.length === 0) {
      if (this.seatControls.length === 0) this.toast.error('Add at least one seat.');
      return;
    }

    this.saving.set(true);
    const raw = this.busForm.getRawValue();
    const seats = raw.seats.map((s) => ({
      seatNumber: s.seatNumber,
      rowNumber: Number(s.rowNumber),
      columnNumber: Number(s.columnNumber),
      deckLevel: Number(s.deckLevel),
      seatType: s.seatType,
      isWindow: s.isWindow,
      extraFare: s.extraFare,
    }));

    const base: BusCreateRequest = {
      busOperatorId: operatorId,
      busCategoryId: raw.busCategoryId || null,
      registrationNumber: raw.registrationNumber,
      coachNumber: raw.coachNumber,
      brand: raw.brand || null,
      model: raw.model || null,
      registrationDate: raw.registrationDate || null,
      busType: raw.busType,
      totalSeats: seats.length,
      hasWifi: raw.hasWifi,
      hasToilet: raw.hasToilet,
      seats,
    };

    const existing = this.editingBus();
    const done = () => {
      this.saving.set(false);
      this.closeBusModal();
      this.loadBuses();
    };

    if (existing) {
      this.fleet.updateBus(existing.id, { ...base, isActive: existing.isActive, rowVersion: existing.rowVersion }).subscribe({
        next: () => {
          this.toast.success('Bus updated.');
          done();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.fleet.createBus(base).subscribe({
        next: () => {
          this.toast.success('Bus added.');
          done();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  findBusRow(id: unknown): Bus | null {
    return this.buses().find((b) => b.id === id) ?? null;
  }

  deleteBusRow(id: unknown): void {
    const bus = this.findBusRow(id);
    if (!bus || !confirm(`Delete bus "${bus.registrationNumber}"?`)) return;
    this.fleet.deleteBus(bus.id).subscribe({
      next: () => {
        this.toast.success('Bus deleted.');
        if (this.selectedBusId() === bus.id) this.selectedBusId.set(null);
        this.loadBuses();
      },
    });
  }

  onCoverImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const busId = this.selectedBusId();
    if (!file || !busId) return;
    this.uploadingCover.set(true);
    this.fleet.uploadBusCoverImage(busId, file).subscribe({
      next: () => {
        this.toast.success('Cover photo updated.');
        this.loadBuses();
        this.uploadingCover.set(false);
      },
      error: () => this.uploadingCover.set(false),
    });
  }

  // --- Gallery images ---

  openImageModal(image: BusImage | null = null): void {
    this.editingImage.set(image);
    this.imageForm.reset(
      image
        ? { imageUrl: image.imageUrl, caption: image.caption ?? '', isPrimary: image.isPrimary, displayOrder: image.displayOrder }
        : { imageUrl: '', caption: '', isPrimary: false, displayOrder: this.images().length },
    );
    this.imageModalOpen.set(true);
  }

  closeImageModal(): void {
    this.imageModalOpen.set(false);
    this.editingImage.set(null);
  }

  saveImage(): void {
    const busId = this.selectedBusId();
    if (!busId || this.imageForm.invalid) return;
    const raw = this.imageForm.getRawValue();
    const existing = this.editingImage();

    const done = () => {
      this.closeImageModal();
      this.fleet.listImages(busId).subscribe((i) => this.images.set(i));
    };

    if (existing) {
      this.fleet.updateImage(existing.id, { busId, ...raw, caption: raw.caption || null, rowVersion: existing.rowVersion }).subscribe(() => {
        this.toast.success('Image updated.');
        done();
      });
    } else {
      this.fleet.createImage({ busId, ...raw, caption: raw.caption || null }).subscribe(() => {
        this.toast.success('Image added.');
        done();
      });
    }
  }

  deleteImage(id: unknown): void {
    const busId = this.selectedBusId();
    if (!busId || !confirm('Remove this image?')) return;
    this.fleet.deleteImage(id as string).subscribe(() => {
      this.toast.success('Image removed.');
      this.fleet.listImages(busId).subscribe((i) => this.images.set(i));
    });
  }

  findImage(id: unknown): BusImage | null {
    return this.images().find((i) => i.id === id) ?? null;
  }

  // --- Maintenance log ---

  openLogModal(log: BusMaintenanceLog | null = null): void {
    this.editingLog.set(log);
    this.logForm.reset(
      log
        ? {
            maintenanceDateUtc: log.maintenanceDateUtc.slice(0, 10),
            odometerKm: log.odometerKm,
            title: log.title,
            description: log.description ?? '',
            cost: log.cost,
            nextDueDateUtc: log.nextDueDateUtc ? log.nextDueDateUtc.slice(0, 10) : '',
            performedBy: log.performedBy ?? '',
          }
        : { maintenanceDateUtc: '', odometerKm: null, title: '', description: '', cost: 0, nextDueDateUtc: '', performedBy: '' },
    );
    this.logModalOpen.set(true);
  }

  closeLogModal(): void {
    this.logModalOpen.set(false);
    this.editingLog.set(null);
  }

  saveLog(): void {
    const busId = this.selectedBusId();
    if (!busId || this.logForm.invalid) return;
    const raw = this.logForm.getRawValue();
    const dto = {
      busId,
      maintenanceDateUtc: raw.maintenanceDateUtc,
      odometerKm: raw.odometerKm,
      title: raw.title,
      description: raw.description || null,
      cost: raw.cost,
      nextDueDateUtc: raw.nextDueDateUtc || null,
      performedBy: raw.performedBy || null,
    };
    const existing = this.editingLog();

    const done = () => {
      this.closeLogModal();
      this.fleet.listMaintenanceLogs(busId).subscribe((l) => this.maintenanceLogs.set(l));
    };

    if (existing) {
      this.fleet.updateMaintenanceLog(existing.id, { ...dto, rowVersion: existing.rowVersion }).subscribe(() => {
        this.toast.success('Maintenance log updated.');
        done();
      });
    } else {
      this.fleet.createMaintenanceLog(dto).subscribe(() => {
        this.toast.success('Maintenance log added.');
        done();
      });
    }
  }

  deleteLog(id: unknown): void {
    const busId = this.selectedBusId();
    if (!busId || !confirm('Delete this maintenance record?')) return;
    this.fleet.deleteMaintenanceLog(id as string).subscribe(() => {
      this.toast.success('Maintenance record deleted.');
      this.fleet.listMaintenanceLogs(busId).subscribe((l) => this.maintenanceLogs.set(l));
    });
  }

  findLog(id: unknown): BusMaintenanceLog | null {
    return this.maintenanceLogs().find((l) => l.id === id) ?? null;
  }

  // --- Driver licenses ---

  selectDriver(driverId: string): void {
    this.selectedDriverId.set(driverId || null);
    if (driverId) {
      this.fleet.listDriverLicenses(driverId).subscribe((l) => this.driverLicenses.set(l));
    } else {
      this.driverLicenses.set([]);
    }
  }

  openLicenseModal(license: DriverLicense | null = null): void {
    this.editingLicense.set(license);
    this.licenseForm.reset(
      license
        ? { licenseNumber: license.licenseNumber, type: license.type, issueDate: license.issueDate, expiryDate: license.expiryDate }
        : { licenseNumber: '', type: 'Light', issueDate: '', expiryDate: '' },
    );
    this.licenseModalOpen.set(true);
  }

  closeLicenseModal(): void {
    this.licenseModalOpen.set(false);
    this.editingLicense.set(null);
  }

  saveLicense(): void {
    const driverId = this.selectedDriverId();
    if (!driverId || this.licenseForm.invalid) return;
    const raw = this.licenseForm.getRawValue();
    const existing = this.editingLicense();

    const done = () => {
      this.closeLicenseModal();
      this.fleet.listDriverLicenses(driverId).subscribe((l) => this.driverLicenses.set(l));
    };

    if (existing) {
      this.fleet.updateDriverLicense(existing.id, { ...raw, rowVersion: existing.rowVersion }).subscribe(() => {
        this.toast.success('License updated.');
        done();
      });
    } else {
      this.fleet.createDriverLicense({ staffProfileId: driverId, ...raw }).subscribe(() => {
        this.toast.success('License added.');
        done();
      });
    }
  }

  deleteLicense(id: unknown): void {
    const driverId = this.selectedDriverId();
    if (!driverId || !confirm('Delete this license record?')) return;
    this.fleet.deleteDriverLicense(id as string).subscribe(() => {
      this.toast.success('License deleted.');
      this.fleet.listDriverLicenses(driverId).subscribe((l) => this.driverLicenses.set(l));
    });
  }

  findLicense(id: unknown): DriverLicense | null {
    return this.driverLicenses().find((l) => l.id === id) ?? null;
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  OperatorBranch,
  OperatorBranchCreateRequest,
  OperatorBranchUpdateRequest,
  OperatorInventoryMode,
} from '@ticketportal-mono/models';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpModalComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { BusOperatorProfileService } from '../../services/bus-operator-profile.service';
import { OperatorContextService } from '../../services/operator-context.service';

const INVENTORY_MODES: OperatorInventoryMode[] = ['PlatformManaged', 'ExternalApiManaged', 'Hybrid'];

@Component({
  selector: 'tp-profile-branches',
  standalone: true,
  imports: [ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpModalComponent, TpTableComponent],
  template: `
    <div class="tp-profile-branches">
      <tp-card>
        <h3>Company Profile</h3>
        <p class="tp-muted">Public-facing info shown to customers when they search for buses on this operator.</p>

        <form [formGroup]="form" (ngSubmit)="saveProfile()" class="tp-form-grid">
          <label>
            Name
            <input type="text" formControlName="name" />
          </label>
          <label>
            Legal name
            <input type="text" formControlName="legalName" />
          </label>
          <label>
            Registration number
            <input type="text" formControlName="registrationNumber" />
          </label>
          <label>
            Contact phone
            <input type="text" formControlName="contactPhone" />
          </label>
          <label>
            Email
            <input type="email" formControlName="email" />
          </label>
          <label>
            Founded year
            <input type="number" formControlName="foundedYear" />
          </label>
          <label class="tp-form-grid__span2">
            Address
            <input type="text" formControlName="addressLine" />
          </label>
          <label>
            City
            <input type="text" formControlName="city" />
          </label>
          <label>
            District
            <input type="text" formControlName="district" />
          </label>
          <label>
            Country
            <input type="text" formControlName="country" />
          </label>
          <label>
            Inventory mode
            <select formControlName="inventoryMode">
              @for (mode of inventoryModes; track mode) {
                <option [value]="mode">{{ mode }}</option>
              }
            </select>
            @if (!isAdmin()) {
              <span class="tp-muted tp-hint">Only a platform Admin can change this.</span>
            }
          </label>

          <div class="tp-form-grid__span2 tp-profile-branches__actions">
            <button tpButton variant="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save Profile' }}
            </button>
          </div>
        </form>

        <div class="tp-profile-branches__logo">
          @if (logoUrl(); as url) {
            <img [src]="url" alt="Operator logo" />
          } @else {
            <div class="tp-profile-branches__logo-placeholder">No logo yet</div>
          }
          <label class="tp-profile-branches__logo-upload">
            <span>{{ uploadingLogo() ? 'Uploading…' : 'Upload logo' }}</span>
            <input type="file" accept="image/*" (change)="onLogoSelected($event)" [disabled]="uploadingLogo()" />
          </label>
        </div>
      </tp-card>

      <tp-card>
        <div class="tp-profile-branches__branches-header">
          <h3>Branches / Depots</h3>
          <button tpButton variant="secondary" size="sm" (click)="openBranchModal()">Add Branch</button>
        </div>

        <tp-table
          [columns]="branchColumns"
          [rows]="branchRows()"
          emptyTitle="No branches yet"
          emptyMessage="Add your depots/counters so staff assignments can reference them."
        >
          <ng-template #rowActions let-row>
            <button tpButton variant="ghost" size="sm" (click)="openBranchModal(findBranch(row['id']))">Edit</button>
            <button tpButton variant="danger" size="sm" (click)="deleteBranch(findBranch(row['id']))">Delete</button>
          </ng-template>
        </tp-table>
      </tp-card>

      <tp-modal [open]="branchModalOpen()" [title]="editingBranch() ? 'Edit Branch' : 'Add Branch'" (closed)="closeBranchModal()">
        <form [formGroup]="branchForm" (ngSubmit)="saveBranch()" class="tp-form-grid">
          <label class="tp-form-grid__span2">
            Branch name
            <input type="text" formControlName="branchName" />
          </label>
          <label class="tp-form-grid__span2">
            Address
            <input type="text" formControlName="address" />
          </label>
          <label>
            City
            <input type="text" formControlName="city" />
          </label>
          <label>
            District
            <input type="text" formControlName="district" />
          </label>
          <label class="tp-form-grid__span2">
            Phone
            <input type="text" formControlName="phone" />
          </label>
        </form>
        <div modal-footer>
          <button tpButton variant="secondary" (click)="closeBranchModal()">Cancel</button>
          <button tpButton variant="primary" [disabled]="branchForm.invalid || savingBranch()" (click)="saveBranch()">
            {{ savingBranch() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </tp-modal>
    </div>
  `,
  styles: [
    `
      .tp-profile-branches {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-5);
      }

      .tp-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--tp-space-4);
        margin-top: var(--tp-space-4);
      }

      .tp-form-grid__span2 {
        grid-column: 1 / -1;
      }

      .tp-form-grid label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-form-grid input,
      .tp-form-grid select,
      .tp-form-grid textarea {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 8px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-hint {
        font-weight: 400;
        font-size: 12px;
      }

      .tp-profile-branches__actions {
        display: flex;
        justify-content: flex-end;
      }

      .tp-profile-branches__logo {
        display: flex;
        align-items: center;
        gap: var(--tp-space-4);
        margin-top: var(--tp-space-5);
        padding-top: var(--tp-space-5);
        border-top: 1px solid var(--tp-border);
      }

      .tp-profile-branches__logo img {
        width: 72px;
        height: 72px;
        object-fit: contain;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        background: var(--tp-bg-soft);
      }

      .tp-profile-branches__logo-placeholder {
        width: 72px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 11px;
        color: var(--tp-text-muted);
        border: 1px dashed var(--tp-border);
        border-radius: var(--tp-radius-sm);
      }

      .tp-profile-branches__logo-upload span {
        display: inline-block;
        margin-bottom: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
      }

      .tp-profile-branches__branches-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--tp-space-4);
      }
    `,
  ],
})
export class ProfileBranchesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(BusOperatorProfileService);
  private readonly ctx = inject(OperatorContextService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly inventoryModes = INVENTORY_MODES;
  protected readonly saving = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly savingBranch = signal(false);
  protected readonly branches = signal<OperatorBranch[]>([]);
  protected readonly branchModalOpen = signal(false);
  protected readonly editingBranch = signal<OperatorBranch | null>(null);

  protected readonly isAdmin = computed(() => this.auth.hasRole('Admin'));
  protected readonly logoUrl = computed(() => this.api.resolveAssetUrl(this.ctx.activeOperator()?.logoUrl));

  protected readonly branchColumns: TpTableColumn[] = [
    { key: 'branchName', label: 'Branch' },
    { key: 'city', label: 'City' },
    { key: 'district', label: 'District' },
    { key: 'phone', label: 'Phone' },
  ];

  protected readonly branchRows = computed(() =>
    this.branches().map((b) => ({ id: b.id, branchName: b.branchName, city: b.city, district: b.district, phone: b.phone })),
  );

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    legalName: [''],
    registrationNumber: [''],
    contactPhone: ['', Validators.required],
    email: [''],
    foundedYear: [null as number | null],
    addressLine: ['', Validators.required],
    city: ['', Validators.required],
    district: ['', Validators.required],
    country: ['Bangladesh', Validators.required],
    inventoryMode: ['PlatformManaged' as OperatorInventoryMode, Validators.required],
  });

  protected readonly branchForm = this.fb.nonNullable.group({
    branchName: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    district: ['', Validators.required],
    phone: ['', Validators.required],
  });

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe(() => {
      this.hydrateFromOperator();
      this.loadBranches();
    });
    if (!this.isAdmin()) {
      this.form.controls.inventoryMode.disable();
    }
  }

  private hydrateFromOperator(): void {
    const op = this.ctx.activeOperator();
    if (!op) return;
    this.form.patchValue({
      name: op.name,
      legalName: op.legalName ?? '',
      registrationNumber: op.registrationNumber ?? '',
      contactPhone: op.contactPhone,
      email: op.email ?? '',
      foundedYear: op.foundedYear,
      addressLine: op.addressLine,
      city: op.city,
      district: op.district,
      country: op.country,
      inventoryMode: op.inventoryMode,
    });
  }

  private loadBranches(): void {
    const id = this.ctx.activeOperatorId();
    if (!id) return;
    this.profileService.listBranches(id).subscribe((branches) => this.branches.set(branches));
  }

  saveProfile(): void {
    const op = this.ctx.activeOperator();
    if (!op || this.form.invalid) return;

    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.profileService
      .updateOperator(op.id, {
        name: raw.name,
        legalName: raw.legalName || null,
        registrationNumber: raw.registrationNumber || null,
        contactPhone: raw.contactPhone,
        email: raw.email || null,
        addressLine: raw.addressLine,
        city: raw.city,
        district: raw.district,
        country: raw.country,
        foundedYear: raw.foundedYear,
        registeredOnUtc: op.registeredOnUtc,
        inventoryMode: raw.inventoryMode,
        isActive: op.isActive,
        rowVersion: op.rowVersion,
        // Untouched here — the routes editor lives on the Network Setup screen; resend exactly
        // what's currently loaded so this save doesn't drop or alter any of them.
        operatorRoutes: op.operatorRoutes.map((r) => ({
          id: r.id,
          busRouteId: r.busRouteId,
          operatorRouteCode: r.operatorRouteCode,
          displayName: r.displayName,
          inventoryModeOverride: r.inventoryModeOverride,
          isActive: r.isActive,
          rowVersion: r.rowVersion,
        })),
      })
      .subscribe({
        next: () => {
          this.toast.success('Profile updated.');
          this.ctx.refreshActiveOperator().subscribe(() => this.hydrateFromOperator());
          this.saving.set(false);
        },
        error: () => this.saving.set(false),
      });
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const id = this.ctx.activeOperatorId();
    if (!file || !id) return;

    this.uploadingLogo.set(true);
    this.profileService.uploadLogo(id, file).subscribe({
      next: () => {
        this.toast.success('Logo updated.');
        this.ctx.refreshActiveOperator().subscribe();
        this.uploadingLogo.set(false);
      },
      error: () => this.uploadingLogo.set(false),
    });
  }

  findBranch(id: unknown): OperatorBranch | null {
    return this.branches().find((b) => b.id === id) ?? null;
  }

  openBranchModal(branch: OperatorBranch | null = null): void {
    this.editingBranch.set(branch);
    this.branchForm.reset(
      branch
        ? { branchName: branch.branchName, address: branch.address, city: branch.city, district: branch.district, phone: branch.phone }
        : { branchName: '', address: '', city: '', district: '', phone: '' },
    );
    this.branchModalOpen.set(true);
  }

  closeBranchModal(): void {
    this.branchModalOpen.set(false);
    this.editingBranch.set(null);
  }

  saveBranch(): void {
    const operatorId = this.ctx.activeOperatorId();
    if (!operatorId || this.branchForm.invalid) return;

    this.savingBranch.set(true);
    const raw = this.branchForm.getRawValue();
    const existing = this.editingBranch();

    const done = () => {
      this.savingBranch.set(false);
      this.closeBranchModal();
      this.loadBranches();
    };

    if (existing) {
      const dto: OperatorBranchUpdateRequest = { busOperatorId: operatorId, ...raw, rowVersion: existing.rowVersion };
      this.profileService.updateBranch(existing.id, dto).subscribe({
        next: () => {
          this.toast.success('Branch updated.');
          done();
        },
        error: () => this.savingBranch.set(false),
      });
    } else {
      const dto: OperatorBranchCreateRequest = { busOperatorId: operatorId, ...raw };
      this.profileService.createBranch(dto).subscribe({
        next: () => {
          this.toast.success('Branch added.');
          done();
        },
        error: () => this.savingBranch.set(false),
      });
    }
  }

  deleteBranch(branch: OperatorBranch | null): void {
    if (!branch) return;
    if (!confirm(`Delete branch "${branch.branchName}"?`)) return;

    this.profileService.deleteBranch(branch.id).subscribe({
      next: () => {
        this.toast.success('Branch deleted.');
        this.loadBranches();
      },
    });
  }
}

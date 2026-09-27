import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Observable, of, tap } from 'rxjs';
import {
  CustomerAddress,
  CustomerAddressCreateRequest,
  CustomerAddressUpdateRequest,
  CustomerProfile,
  CustomerProfileCreateRequest,
  CustomerProfileUpdateRequest,
  Gender,
} from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpSpinnerComponent } from '../../../../shared/ui';

const GENDERS: Gender[] = ['Unknown', 'Male', 'Female', 'Other'];

/** 'YYYY-MM-DD', built from local date parts (not toISOString) so the day never shifts across a UTC boundary. */
function toIsoDateString(value: Date | null): string | undefined {
  if (!value) return undefined;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDateString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// The backend's CustomerAddress only has one free-text AddressLine field (see
// Models/People/CustomerAddress.cs) — there's no separate Line1/Line2 column. Rather than a
// migration, "Address Line 2" is stored as a second line in that same field, joined/split on
// '\n'. A customer only ever has the one address here (this page isn't the old multi-address
// manager), so Label/IsDefault are just set to sensible fixed values under the hood.
const ADDRESS_LABEL = 'Home';

function splitAddressLine(value: string | null | undefined): { line1: string; line2: string } {
  if (!value) return { line1: '', line2: '' };
  const [line1 = '', ...rest] = value.split('\n');
  return { line1, line2: rest.join('\n') };
}

function joinAddressLine(line1: string, line2: string): string {
  return line2.trim() ? `${line1}\n${line2}` : line1;
}

/**
 * A CustomerProfile isn't created at registration (see PeopleDtos.cs) — it's created lazily,
 * the first time a customer needs one. Most customers will get theirs implicitly the first
 * time they book (BookingsController resolves-or-creates one), so this screen mainly EDITS an
 * existing profile — but it still needs to handle "no profile yet" gracefully for a customer
 * who lands here before ever booking anything.
 *
 * Reached only via the navbar's account dropdown ("My Profile") — it's deliberately not one of
 * the My Account tabs (Bookings/Wallet/Cancellations), so it doesn't render <tp-account-nav>.
 * Saved address is a single set of plain fields embedded directly in this form (Address Line
 * 1/2, City, District, Country) rather than a separate "Addresses" page/tab with its own
 * add/edit/delete list — see the address-splitting helpers above for how that maps onto the
 * backend's CustomerAddress entity, which still technically supports several.
 */
@Component({
  selector: 'tp-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TpCardComponent,
    TpButtonDirective,
    TpSpinnerComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  template: `
    <div class="tp-page tp-profile-page">
      <h2>My Profile</h2>

      @if (loading()) {
        <tp-spinner size="lg" />
      } @else {
        <tp-card>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="tp-form-grid">
              <mat-form-field appearance="outline">
                <mat-label>National ID (optional)</mat-label>
                <input matInput formControlName="nationalIdNumber" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Date of Birth</mat-label>
                <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" />
                <mat-datepicker-toggle matIconSuffix [for]="dobPicker" />
                <mat-datepicker #dobPicker startView="multi-year" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Gender</mat-label>
                <mat-select formControlName="gender">
                  @for (g of genders; track g) {
                    <mat-option [value]="g">{{ g }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Emergency Contact Phone</mat-label>
                <input matInput formControlName="emergencyContactPhone" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Preferred Language Code</mat-label>
                <input matInput formControlName="preferredLanguageCode" placeholder="en" />
              </mat-form-field>
            </div>

            <h3 class="tp-section-heading">Address</h3>
            <div class="tp-form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Address Line 1</mat-label>
                <input matInput formControlName="addressLine1" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Address Line 2 (optional)</mat-label>
                <input matInput formControlName="addressLine2" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>City</mat-label>
                <input matInput formControlName="city" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>District</mat-label>
                <input matInput formControlName="district" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Country</mat-label>
                <input matInput formControlName="country" />
              </mat-form-field>
            </div>

            <div class="tp-profile-page__actions">
              <button tpButton variant="primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save Profile' }}
              </button>
            </div>
          </form>
        </tp-card>
      }
    </div>
  `,
  styles: [
    `
      .tp-profile-page {
        max-width: 640px;
      }

      .tp-section-heading {
        margin: var(--tp-space-5) 0 var(--tp-space-2);
      }

      .tp-form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--tp-space-2) var(--tp-space-4);
      }

      .tp-form-grid mat-form-field {
        width: 100%;
      }

      .tp-profile-page__actions {
        display: flex;
        justify-content: flex-end;
        margin-top: var(--tp-space-3);
      }

      @media (max-width: 560px) {
        .tp-form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly genders = GENDERS;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  private existingProfile: CustomerProfile | null = null;
  private existingAddress: CustomerAddress | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nationalIdNumber: [''],
    dateOfBirth: this.fb.control<Date | null>(null),
    gender: this.fb.nonNullable.control<Gender>('Unknown', Validators.required),
    emergencyContactPhone: [''],
    preferredLanguageCode: ['en'],
    addressLine1: [''],
    addressLine2: [''],
    city: [''],
    district: [''],
    country: ['Bangladesh'],
  });

  ngOnInit(): void {
    this.api.get<CustomerProfile[]>('customerprofiles').subscribe({
      next: (profiles) => {
        this.existingProfile = profiles[0] ?? null;
        if (this.existingProfile) {
          this.form.patchValue({
            nationalIdNumber: this.existingProfile.nationalIdNumber ?? '',
            dateOfBirth: parseIsoDateString(this.existingProfile.dateOfBirth),
            gender: this.existingProfile.gender,
            emergencyContactPhone: this.existingProfile.emergencyContactPhone ?? '',
            preferredLanguageCode: this.existingProfile.preferredLanguageCode ?? 'en',
          });
        }
        this.loadAddress();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadAddress(): void {
    this.api.get<CustomerAddress[]>('customeraddresses').subscribe({
      next: (addresses) => {
        this.existingAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
        if (this.existingAddress) {
          const { line1, line2 } = splitAddressLine(this.existingAddress.addressLine);
          this.form.patchValue({
            addressLine1: line1,
            addressLine2: line2,
            city: this.existingAddress.city,
            district: this.existingAddress.district,
            country: this.existingAddress.country,
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saveProfile().subscribe({
      next: () => {
        this.saveAddressIfNeeded().subscribe({
          next: () => {
            this.saving.set(false);
            this.toast.success('Profile saved.');
          },
          error: () => this.saving.set(false),
        });
      },
      error: () => this.saving.set(false),
    });
  }

  private saveProfile(): Observable<CustomerProfile> {
    const values = this.form.getRawValue();
    const dateOfBirth = toIsoDateString(values.dateOfBirth);

    if (this.existingProfile) {
      const request: CustomerProfileUpdateRequest = {
        nationalIdNumber: values.nationalIdNumber || undefined,
        dateOfBirth,
        gender: values.gender,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
        preferredLanguageCode: values.preferredLanguageCode || undefined,
        rowVersion: this.existingProfile.rowVersion,
      };
      return this.api.put<CustomerProfile>(`customerprofiles/${this.existingProfile.id}`, request).pipe(
        tap((profile) => (this.existingProfile = profile)),
      );
    }

    const currentUser = this.auth.currentUser();
    const request: CustomerProfileCreateRequest = {
      userId: currentUser?.userId ?? '',
      nationalIdNumber: values.nationalIdNumber || undefined,
      dateOfBirth,
      gender: values.gender,
      emergencyContactPhone: values.emergencyContactPhone || undefined,
      preferredLanguageCode: values.preferredLanguageCode || undefined,
    };
    return this.api.post<CustomerProfile>('customerprofiles', request).pipe(
      tap((profile) => (this.existingProfile = profile)),
    );
  }

  // Only touches the backend if there's actually address content to save — a customer who
  // leaves every address field blank shouldn't get an empty CustomerAddress row created.
  // Explicit return type keeps this a single Observable<CustomerAddress | null> rather than a
  // union of differently-generic Observables that `subscribe` can't call cleanly.
  private saveAddressIfNeeded(): Observable<CustomerAddress | null> {
    const values = this.form.getRawValue();
    const addressLine = joinAddressLine(values.addressLine1.trim(), values.addressLine2.trim());
    const hasContent = !!(addressLine || values.city.trim() || values.district.trim());

    if (!hasContent) {
      return of(null);
    }

    if (this.existingAddress) {
      const request: CustomerAddressUpdateRequest = {
        label: this.existingAddress.label || ADDRESS_LABEL,
        addressLine,
        city: values.city.trim(),
        district: values.district.trim(),
        country: values.country.trim() || 'Bangladesh',
        isDefault: true,
        rowVersion: this.existingAddress.rowVersion,
      };
      return this.api.put<CustomerAddress>(`customeraddresses/${this.existingAddress.id}`, request).pipe(
        tap((address) => (this.existingAddress = address)),
      );
    }

    const request: CustomerAddressCreateRequest = {
      label: ADDRESS_LABEL,
      addressLine,
      city: values.city.trim(),
      district: values.district.trim(),
      country: values.country.trim() || 'Bangladesh',
      isDefault: true,
    };
    return this.api.post<CustomerAddress>('customeraddresses', request).pipe(
      tap((address) => (this.existingAddress = address)),
    );
  }
}

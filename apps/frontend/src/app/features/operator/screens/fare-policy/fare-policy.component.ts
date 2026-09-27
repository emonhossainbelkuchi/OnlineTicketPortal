import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BusRoute,
  BusType,
  CancellationPolicy,
  CancellationPolicyCreateRequest,
  CancellationPolicyRuleCreateRequest,
  FareRule,
  SeatType,
} from '@ticketportal-mono/models';
import { ToastService } from '../../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpModalComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { BusOperatorProfileService } from '../../services/bus-operator-profile.service';
import { FarePolicyService } from '../../services/fare-policy.service';
import { OperatorContextService } from '../../services/operator-context.service';

const BUS_TYPES: (BusType | '')[] = ['', 'NonAc', 'Ac', 'Sleeper', 'DoubleDecker', 'BusinessClass', 'Economy', 'Luxury'];
const SEAT_TYPES: (SeatType | '')[] = ['', 'Regular', 'Window', 'Aisle', 'Middle', 'Sleeper', 'Business'];

@Component({
  selector: 'tp-fare-policy',
  standalone: true,
  imports: [ReactiveFormsModule, TpButtonDirective, TpCardComponent, TpModalComponent, TpTableComponent],
  templateUrl: './fare-policy.component.html',
  styleUrl: './fare-policy.component.css',
})
export class FarePolicyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly farePolicy = inject(FarePolicyService);
  private readonly profileService = inject(BusOperatorProfileService);
  private readonly ctx = inject(OperatorContextService);
  private readonly toast = inject(ToastService);

  protected readonly busTypes = BUS_TYPES;
  protected readonly seatTypes = SEAT_TYPES;

  protected readonly fareRules = signal<FareRule[]>([]);
  protected readonly policies = signal<CancellationPolicy[]>([]);
  protected readonly busRoutes = signal<BusRoute[]>([]);
  protected readonly saving = signal(false);

  protected readonly fareModalOpen = signal(false);
  protected readonly editingFareRule = signal<FareRule | null>(null);
  protected readonly policyModalOpen = signal(false);
  protected readonly editingPolicy = signal<CancellationPolicy | null>(null);

  protected readonly busRouteName = computed(() => {
    const map = new Map(this.busRoutes().map((r) => [r.id, r.name]));
    return (id: string) => map.get(id) ?? id;
  });

  protected readonly fareColumns: TpTableColumn[] = [
    { key: 'route', label: 'Route' },
    { key: 'busType', label: 'Bus Type' },
    { key: 'seatType', label: 'Seat Type' },
    { key: 'baseFare', label: 'Base Fare', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  protected readonly fareRows = computed(() =>
    this.fareRules().map((r) => ({
      id: r.id,
      route: this.busRouteName()(r.busRouteId),
      busType: r.busType ?? 'Any',
      seatType: r.seatType ?? 'Any',
      baseFare: `${r.baseFare} ${r.currency}`,
      status: r.isActive ? 'Active' : 'Inactive',
    })),
  );

  protected readonly policyColumns: TpTableColumn[] = [
    { key: 'name', label: 'Policy' },
    { key: 'ruleCount', label: 'Tiers', align: 'right' },
    { key: 'status', label: 'Status' },
  ];
  protected readonly policyRows = computed(() =>
    this.policies().map((p) => ({ id: p.id, name: p.name, ruleCount: p.rules.length, status: p.isActive ? 'Active' : 'Inactive' })),
  );

  protected readonly fareForm = this.fb.nonNullable.group({
    busRouteId: ['', Validators.required],
    busType: [''],
    seatType: [''],
    baseFare: [0, Validators.required],
    currency: ['BDT', Validators.required],
    effectiveFromUtc: ['', Validators.required],
    effectiveToUtc: [''],
    isActive: [true],
  });

  protected readonly policyForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    effectiveFromUtc: [''],
    effectiveToUtc: [''],
    isActive: [true],
    rules: this.fb.array<ReturnType<FarePolicyComponent['buildRuleGroup']>>([]),
  });

  private buildRuleGroup(rule?: CancellationPolicyRuleCreateRequest) {
    return this.fb.nonNullable.group({
      minHoursBeforeDeparture: [rule?.minHoursBeforeDeparture ?? 24, Validators.required],
      maxHoursBeforeDeparture: [rule?.maxHoursBeforeDeparture ?? null],
      refundPercentage: [rule?.refundPercentage ?? 100, Validators.required],
      fixedCancellationFee: [rule?.fixedCancellationFee ?? 0, Validators.required],
    });
  }

  get ruleControls() {
    return this.policyForm.controls.rules.controls;
  }

  ngOnInit(): void {
    this.ctx.ensureLoaded().subscribe(() => {
      this.loadFareRules();
      this.loadPolicies();
      this.profileService.listBusRoutes().subscribe((r) => this.busRoutes.set(r));
    });
  }

  private loadFareRules(): void {
    const id = this.ctx.activeOperatorId();
    if (!id) return;
    this.farePolicy.listFareRules(id).subscribe((rules) => this.fareRules.set(rules));
  }

  private loadPolicies(): void {
    const id = this.ctx.activeOperatorId();
    if (!id) return;
    this.farePolicy.listCancellationPolicies(id).subscribe((policies) => this.policies.set(policies));
  }

  // --- Fare rules ---

  findFareRule(id: unknown): FareRule | null {
    return this.fareRules().find((r) => r.id === id) ?? null;
  }

  openFareModal(rule: FareRule | null = null): void {
    this.editingFareRule.set(rule);
    this.fareForm.reset(
      rule
        ? {
            busRouteId: rule.busRouteId,
            busType: rule.busType ?? '',
            seatType: rule.seatType ?? '',
            baseFare: rule.baseFare,
            currency: rule.currency,
            effectiveFromUtc: rule.effectiveFromUtc.slice(0, 10),
            effectiveToUtc: rule.effectiveToUtc ? rule.effectiveToUtc.slice(0, 10) : '',
            isActive: rule.isActive,
          }
        : { busRouteId: '', busType: '', seatType: '', baseFare: 0, currency: 'BDT', effectiveFromUtc: '', effectiveToUtc: '', isActive: true },
    );
    this.fareModalOpen.set(true);
  }

  closeFareModal(): void {
    this.fareModalOpen.set(false);
    this.editingFareRule.set(null);
  }

  saveFareRule(): void {
    const operatorId = this.ctx.activeOperatorId();
    if (!operatorId || this.fareForm.invalid) return;

    const raw = this.fareForm.getRawValue();
    const dto = {
      busOperatorId: operatorId,
      busRouteId: raw.busRouteId,
      busType: (raw.busType || null) as BusType | null,
      seatType: (raw.seatType || null) as SeatType | null,
      baseFare: raw.baseFare,
      currency: raw.currency,
      effectiveFromUtc: new Date(raw.effectiveFromUtc).toISOString(),
      effectiveToUtc: raw.effectiveToUtc ? new Date(raw.effectiveToUtc).toISOString() : null,
      isActive: raw.isActive,
    };
    const existing = this.editingFareRule();
    this.saving.set(true);

    const done = () => {
      this.saving.set(false);
      this.closeFareModal();
      this.loadFareRules();
    };

    if (existing) {
      this.farePolicy.updateFareRule(existing.id, { ...dto, rowVersion: existing.rowVersion }).subscribe({
        next: () => {
          this.toast.success('Fare rule updated.');
          done();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.farePolicy.createFareRule(dto).subscribe({
        next: () => {
          this.toast.success('Fare rule added.');
          done();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  deleteFareRule(id: unknown): void {
    const rule = this.findFareRule(id);
    if (!rule || !confirm('Delete this fare rule?')) return;
    this.farePolicy.deleteFareRule(rule.id).subscribe(() => {
      this.toast.success('Fare rule deleted.');
      this.loadFareRules();
    });
  }

  // --- Cancellation policies ---

  findPolicy(id: unknown): CancellationPolicy | null {
    return this.policies().find((p) => p.id === id) ?? null;
  }

  addRuleRow(): void {
    this.policyForm.controls.rules.push(this.buildRuleGroup());
  }

  removeRuleRow(index: number): void {
    this.policyForm.controls.rules.removeAt(index);
  }

  openPolicyModal(policy: CancellationPolicy | null = null): void {
    this.editingPolicy.set(policy);
    const rulesArray = this.policyForm.controls.rules;
    while (rulesArray.length) rulesArray.removeAt(0);

    this.policyForm.patchValue({
      name: policy?.name ?? '',
      description: policy?.description ?? '',
      effectiveFromUtc: policy?.effectiveFromUtc ? policy.effectiveFromUtc.slice(0, 10) : '',
      effectiveToUtc: policy?.effectiveToUtc ? policy.effectiveToUtc.slice(0, 10) : '',
      isActive: policy?.isActive ?? true,
    });

    if (policy) {
      policy.rules
        .slice()
        .sort((a, b) => a.minHoursBeforeDeparture - b.minHoursBeforeDeparture)
        .forEach((rule) => rulesArray.push(this.buildRuleGroup(rule)));
    } else {
      rulesArray.push(this.buildRuleGroup());
    }

    this.policyModalOpen.set(true);
  }

  closePolicyModal(): void {
    this.policyModalOpen.set(false);
    this.editingPolicy.set(null);
  }

  savePolicy(): void {
    const operatorId = this.ctx.activeOperatorId();
    if (!operatorId || this.policyForm.invalid || this.ruleControls.length === 0) {
      if (this.ruleControls.length === 0) this.toast.error('Add at least one refund tier.');
      return;
    }

    const raw = this.policyForm.getRawValue();
    const dto: CancellationPolicyCreateRequest = {
      busOperatorId: operatorId,
      name: raw.name,
      description: raw.description || null,
      effectiveFromUtc: raw.effectiveFromUtc ? new Date(raw.effectiveFromUtc).toISOString() : null,
      effectiveToUtc: raw.effectiveToUtc ? new Date(raw.effectiveToUtc).toISOString() : null,
      rules: raw.rules.map((r) => ({
        minHoursBeforeDeparture: r.minHoursBeforeDeparture,
        maxHoursBeforeDeparture: r.maxHoursBeforeDeparture,
        refundPercentage: r.refundPercentage,
        fixedCancellationFee: r.fixedCancellationFee,
      })),
    };
    const existing = this.editingPolicy();
    this.saving.set(true);

    const done = () => {
      this.saving.set(false);
      this.closePolicyModal();
      this.loadPolicies();
    };

    if (existing) {
      this.farePolicy
        .updateCancellationPolicy(existing.id, { ...dto, isActive: raw.isActive, rowVersion: existing.rowVersion })
        .subscribe({
          next: () => {
            this.toast.success('Policy updated.');
            done();
          },
          error: () => this.saving.set(false),
        });
    } else {
      this.farePolicy.createCancellationPolicy(dto).subscribe({
        next: () => {
          this.toast.success('Policy created.');
          done();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  deletePolicy(id: unknown): void {
    const policy = this.findPolicy(id);
    if (!policy || !confirm(`Delete policy "${policy.name}"?`)) return;
    this.farePolicy.deleteCancellationPolicy(policy.id).subscribe(() => {
      this.toast.success('Policy deleted.');
      this.loadPolicies();
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Currency,
  PaymentGateway,
  PaymentMethod,
  PaymentMethodConfiguration,
  PaymentProvider,
  PaymentProviderKind,
  TaxRule,
} from '@ticketportal-mono/models';
import {
  TpButtonDirective,
  TpCardComponent,
  TpModalComponent,
  TpSpinnerComponent,
  TpTableColumn,
  TpTableComponent,
  TpTabsComponent,
} from '../../../shared/ui';
import { ToastService } from '../../../core/services/toast.service';
import { FinanceApiService } from '../services/finance-api.service';
import { formatMoney } from '../shared/money.util';

const PROVIDER_KINDS: PaymentProviderKind[] = ['Gateway', 'MobileBanking', 'CardNetwork', 'Bank', 'Cash', 'Wallet'];
const GATEWAYS: PaymentGateway[] = [
  'None',
  'SslCommerz',
  'Bkash',
  'Nagad',
  'Rocket',
  'Stripe',
  'PayPal',
  'Visa',
  'MasterCard',
  'Manual',
];
const METHODS: PaymentMethod[] = ['Cash', 'Card', 'MobileBanking', 'BankTransfer', 'OnlineGateway', 'Wallet'];

interface TaxRuleRow {
  [key: string]: unknown;
  id: string;
  name: string;
  percentageDisplay: string;
  statusDisplay: string;
  rule: TaxRule;
}

interface CurrencyRow {
  [key: string]: unknown;
  id: string;
  code: string;
  symbol: string;
  exchangeRateDisplay: string;
  baseDisplay: string;
  statusDisplay: string;
  currency: Currency;
}

interface ProviderRow {
  [key: string]: unknown;
  id: string;
  name: string;
  code: string;
  providerKind: string;
  gateway: string;
  statusDisplay: string;
  provider: PaymentProvider;
}

interface MethodConfigRow {
  [key: string]: unknown;
  id: string;
  providerName: string;
  method: string;
  displayName: string;
  feeDisplay: string;
  statusDisplay: string;
  config: PaymentMethodConfiguration;
}

/**
 * Screen 6 — platform-wide finance reference data. Every controller behind
 * this screen (TaxRules/Currencies/PaymentProviders/PaymentMethodConfigurations)
 * gates every action on `User.IsInRole("Admin")` — a Staff caller reaching
 * this tab sees empty lists and a 403 toast on any write, which is expected.
 */
@Component({
  selector: 'tp-system-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TpCardComponent,
    TpTableComponent,
    TpButtonDirective,
    TpModalComponent,
    TpSpinnerComponent,
    TpTabsComponent,
  ],
  template: `
    <tp-card>
      <h3>System Finance Config</h3>
      <p class="tp-muted">Tax rules, currencies, payment providers, and per-method fee configuration. Admin-only.</p>

      <tp-tabs
        [tabs]="['Tax Rules', 'Currencies', 'Payment Providers', 'Payment Methods']"
        [activeIndex]="activeTab"
        (activeIndexChange)="activeTab = $event"
      />

      @switch (activeTab) {
        @case (0) {
          <div class="tp-panel-toolbar">
            <span></span>
            <button tpButton variant="primary" (click)="openTaxRuleForm()">+ New Tax Rule</button>
          </div>
          @if (taxRulesLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table [columns]="taxRuleColumns" [rows]="taxRuleRows()" emptyTitle="No tax rules yet">
              <ng-template #rowActions let-row>
                <button tpButton variant="ghost" size="sm" (click)="openTaxRuleForm(row.rule)">Edit</button>
                <button tpButton variant="ghost" size="sm" (click)="deleteTaxRule(row.id)">Delete</button>
              </ng-template>
            </tp-table>
          }
        }
        @case (1) {
          <div class="tp-panel-toolbar">
            <span></span>
            <button tpButton variant="primary" (click)="openCurrencyForm()">+ New Currency</button>
          </div>
          @if (currenciesLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table [columns]="currencyColumns" [rows]="currencyRows()" emptyTitle="No currencies yet">
              <ng-template #rowActions let-row>
                <button tpButton variant="ghost" size="sm" (click)="openCurrencyForm(row.currency)">Edit</button>
                <button tpButton variant="ghost" size="sm" (click)="deleteCurrency(row.id)">Delete</button>
              </ng-template>
            </tp-table>
          }
        }
        @case (2) {
          <div class="tp-panel-toolbar">
            <span></span>
            <button tpButton variant="primary" (click)="openProviderForm()">+ New Provider</button>
          </div>
          @if (providersLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table [columns]="providerColumns" [rows]="providerRows()" emptyTitle="No payment providers yet">
              <ng-template #rowActions let-row>
                <button tpButton variant="ghost" size="sm" (click)="openProviderForm(row.provider)">Edit</button>
                <button tpButton variant="ghost" size="sm" (click)="deleteProvider(row.id)">Delete</button>
              </ng-template>
            </tp-table>
          }
        }
        @case (3) {
          <div class="tp-panel-toolbar">
            <span></span>
            <button tpButton variant="primary" [disabled]="providers().length === 0" (click)="openMethodConfigForm()">
              + New Payment Method
            </button>
          </div>
          @if (methodConfigsLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table [columns]="methodConfigColumns" [rows]="methodConfigRows()" emptyTitle="No payment methods configured yet">
              <ng-template #rowActions let-row>
                <button tpButton variant="ghost" size="sm" (click)="openMethodConfigForm(row.config)">Edit</button>
                <button tpButton variant="ghost" size="sm" (click)="deleteMethodConfig(row.id)">Delete</button>
              </ng-template>
            </tp-table>
          }
        }
      }
    </tp-card>

    <!-- Tax Rule form -->
    <tp-modal [open]="showTaxRuleForm()" [title]="editingTaxRuleId() ? 'Edit Tax Rule' : 'New Tax Rule'" (closed)="showTaxRuleForm.set(false)">
      <form [formGroup]="taxRuleForm" (ngSubmit)="submitTaxRule()" class="tp-finance-form">
        <label>Name<input type="text" formControlName="name" /></label>
        <label>Percentage (%)<input type="number" step="0.01" min="0" max="100" formControlName="percentage" /></label>
        <label class="tp-finance-form__checkbox"><input type="checkbox" formControlName="isActive" /> Active</label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="showTaxRuleForm.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="taxRuleForm.invalid || submitting()" (click)="submitTaxRule()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>

    <!-- Currency form -->
    <tp-modal [open]="showCurrencyForm()" [title]="editingCurrencyId() ? 'Edit Currency' : 'New Currency'" (closed)="showCurrencyForm.set(false)">
      <form [formGroup]="currencyForm" (ngSubmit)="submitCurrency()" class="tp-finance-form">
        <div class="tp-finance-form__row">
          <label>Code (3 letters)<input type="text" maxlength="3" formControlName="code" style="text-transform: uppercase" /></label>
          <label>Symbol<input type="text" formControlName="symbol" /></label>
        </div>
        <label>Exchange Rate to Base<input type="number" step="0.000001" min="0" formControlName="exchangeRateToBase" /></label>
        <label class="tp-finance-form__checkbox"><input type="checkbox" formControlName="isBaseCurrency" /> Base Currency</label>
        <label class="tp-finance-form__checkbox"><input type="checkbox" formControlName="isActive" /> Active</label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="showCurrencyForm.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="currencyForm.invalid || submitting()" (click)="submitCurrency()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>

    <!-- Payment Provider form -->
    <tp-modal [open]="showProviderForm()" [title]="editingProviderId() ? 'Edit Provider' : 'New Provider'" (closed)="showProviderForm.set(false)">
      <form [formGroup]="providerForm" (ngSubmit)="submitProvider()" class="tp-finance-form">
        <div class="tp-finance-form__row">
          <label>Name<input type="text" formControlName="name" /></label>
          <label>Code<input type="text" formControlName="code" /></label>
        </div>
        <div class="tp-finance-form__row">
          <label>
            Kind
            <select formControlName="providerKind">
              @for (kind of providerKinds; track kind) { <option [value]="kind">{{ kind }}</option> }
            </select>
          </label>
          <label>
            Gateway
            <select formControlName="gateway">
              @for (gateway of gateways; track gateway) { <option [value]="gateway">{{ gateway }}</option> }
            </select>
          </label>
        </div>
        <label>Checkout Base URL (optional)<input type="text" formControlName="checkoutBaseUrl" /></label>
        <label>Webhook URL (optional)<input type="text" formControlName="webhookUrl" /></label>
        <label class="tp-finance-form__checkbox"><input type="checkbox" formControlName="supportsRefund" /> Supports Refund</label>
        <label class="tp-finance-form__checkbox"><input type="checkbox" formControlName="isActive" /> Active</label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="showProviderForm.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="providerForm.invalid || submitting()" (click)="submitProvider()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>

    <!-- Payment Method Configuration form -->
    <tp-modal
      [open]="showMethodConfigForm()"
      [title]="editingMethodConfigId() ? 'Edit Payment Method' : 'New Payment Method'"
      (closed)="showMethodConfigForm.set(false)"
    >
      <form [formGroup]="methodConfigForm" (ngSubmit)="submitMethodConfig()" class="tp-finance-form">
        <label>
          Provider
          <select formControlName="paymentProviderId">
            <option value="" disabled>Select a provider…</option>
            @for (provider of providers(); track provider.id) { <option [value]="provider.id">{{ provider.name }}</option> }
          </select>
        </label>
        <label>
          Method
          <select formControlName="method">
            @for (method of methods; track method) { <option [value]="method">{{ method }}</option> }
          </select>
        </label>
        <label>Display Name<input type="text" formControlName="displayName" /></label>
        <div class="tp-finance-form__row">
          <label>Fixed Fee (optional)<input type="number" step="0.01" min="0" formControlName="fixedFee" /></label>
          <label>Percentage Fee (optional, %)<input type="number" step="0.01" min="0" max="100" formControlName="percentageFee" /></label>
        </div>
        <label class="tp-finance-form__checkbox"><input type="checkbox" formControlName="isActive" /> Active</label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="showMethodConfigForm.set(false)">Cancel</button>
        <button tpButton variant="primary" [disabled]="methodConfigForm.invalid || submitting()" (click)="submitMethodConfig()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      h3 {
        margin-bottom: var(--tp-space-1);
      }

      .tp-panel-toolbar {
        display: flex;
        justify-content: space-between;
        margin-bottom: var(--tp-space-4);
      }

      .tp-panel-loading {
        display: flex;
        justify-content: center;
        padding: var(--tp-space-7) 0;
      }

      .tp-finance-form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
      }

      .tp-finance-form__row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--tp-space-4);
      }

      .tp-finance-form label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-finance-form__checkbox {
        flex-direction: row !important;
        align-items: center;
        gap: var(--tp-space-2) !important;
      }

      .tp-finance-form input,
      .tp-finance-form select {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-finance-form input:focus,
      .tp-finance-form select:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }
    `,
  ],
})
export class SystemConfigComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  activeTab = 0;
  protected readonly submitting = signal(false);
  protected readonly providerKinds = PROVIDER_KINDS;
  protected readonly gateways = GATEWAYS;
  protected readonly methods = METHODS;

  // ---- Tax Rules ----
  private readonly taxRules = signal<TaxRule[]>([]);
  protected readonly taxRulesLoading = signal(false);
  protected readonly showTaxRuleForm = signal(false);
  protected readonly editingTaxRuleId = signal<string | null>(null);
  private editingTaxRuleRowVersion: string | null = null;

  protected readonly taxRuleColumns: TpTableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'percentageDisplay', label: 'Percentage', align: 'right' },
    { key: 'statusDisplay', label: 'Status' },
  ];

  protected readonly taxRuleRows = computed<TaxRuleRow[]>(() =>
    this.taxRules().map((rule) => ({
      id: rule.id,
      name: rule.name,
      percentageDisplay: `${rule.percentage}%`,
      statusDisplay: rule.isActive ? 'Active' : 'Inactive',
      rule,
    })),
  );

  protected readonly taxRuleForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    isActive: [true],
  });

  // ---- Currencies ----
  private readonly currencies = signal<Currency[]>([]);
  protected readonly currenciesLoading = signal(false);
  protected readonly showCurrencyForm = signal(false);
  protected readonly editingCurrencyId = signal<string | null>(null);
  private editingCurrencyRowVersion: string | null = null;

  protected readonly currencyColumns: TpTableColumn[] = [
    { key: 'code', label: 'Code' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'exchangeRateDisplay', label: 'Exchange Rate', align: 'right' },
    { key: 'baseDisplay', label: 'Base?' },
    { key: 'statusDisplay', label: 'Status' },
  ];

  protected readonly currencyRows = computed<CurrencyRow[]>(() =>
    this.currencies().map((c) => ({
      id: c.id,
      code: c.code,
      symbol: c.symbol,
      exchangeRateDisplay: `${c.exchangeRateToBase}`,
      baseDisplay: c.isBaseCurrency ? 'Base' : '—',
      statusDisplay: c.isActive ? 'Active' : 'Inactive',
      currency: c,
    })),
  );

  protected readonly currencyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    symbol: ['', Validators.required],
    exchangeRateToBase: [1, [Validators.required, Validators.min(0)]],
    isBaseCurrency: [false],
    isActive: [true],
  });

  // ---- Payment Providers ----
  protected readonly providers = signal<PaymentProvider[]>([]);
  protected readonly providersLoading = signal(false);
  protected readonly showProviderForm = signal(false);
  protected readonly editingProviderId = signal<string | null>(null);
  private editingProviderRowVersion: string | null = null;

  protected readonly providerColumns: TpTableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'providerKind', label: 'Kind' },
    { key: 'gateway', label: 'Gateway' },
    { key: 'statusDisplay', label: 'Status' },
  ];

  protected readonly providerRows = computed<ProviderRow[]>(() =>
    this.providers().map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      providerKind: p.providerKind,
      gateway: p.gateway,
      statusDisplay: p.isActive ? 'Active' : 'Inactive',
      provider: p,
    })),
  );

  protected readonly providerForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    providerKind: ['Gateway' as PaymentProviderKind, Validators.required],
    gateway: ['None' as PaymentGateway, Validators.required],
    checkoutBaseUrl: [''],
    webhookUrl: [''],
    supportsRefund: [true],
    isActive: [true],
  });

  // ---- Payment Method Configurations ----
  private readonly methodConfigs = signal<PaymentMethodConfiguration[]>([]);
  protected readonly methodConfigsLoading = signal(false);
  protected readonly showMethodConfigForm = signal(false);
  protected readonly editingMethodConfigId = signal<string | null>(null);
  private editingMethodConfigRowVersion: string | null = null;

  protected readonly methodConfigColumns: TpTableColumn[] = [
    { key: 'providerName', label: 'Provider' },
    { key: 'method', label: 'Method' },
    { key: 'displayName', label: 'Display Name' },
    { key: 'feeDisplay', label: 'Fee' },
    { key: 'statusDisplay', label: 'Status' },
  ];

  protected readonly methodConfigRows = computed<MethodConfigRow[]>(() =>
    this.methodConfigs().map((mc) => {
      const provider = this.providers().find((p) => p.id === mc.paymentProviderId);
      const feeParts: string[] = [];
      if (mc.fixedFee) feeParts.push(formatMoney(mc.fixedFee));
      if (mc.percentageFee) feeParts.push(`${mc.percentageFee}%`);
      return {
        id: mc.id,
        providerName: provider?.name ?? mc.paymentProviderId,
        method: mc.method,
        displayName: mc.displayName,
        feeDisplay: feeParts.length ? feeParts.join(' + ') : '—',
        statusDisplay: mc.isActive ? 'Active' : 'Inactive',
        config: mc,
      };
    }),
  );

  protected readonly methodConfigForm = this.fb.nonNullable.group({
    paymentProviderId: ['', Validators.required],
    method: ['OnlineGateway' as PaymentMethod, Validators.required],
    displayName: ['', Validators.required],
    fixedFee: this.fb.control<number | null>(null),
    percentageFee: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(100)]),
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadTaxRules();
    this.loadCurrencies();
    this.loadProviders();
    this.loadMethodConfigs();
  }

  private loadTaxRules(): void {
    this.taxRulesLoading.set(true);
    this.financeApi.listTaxRules().subscribe({
      next: (rules) => {
        this.taxRules.set(rules);
        this.taxRulesLoading.set(false);
      },
      error: () => this.taxRulesLoading.set(false),
    });
  }

  private loadCurrencies(): void {
    this.currenciesLoading.set(true);
    this.financeApi.listCurrencies().subscribe({
      next: (currencies) => {
        this.currencies.set(currencies);
        this.currenciesLoading.set(false);
      },
      error: () => this.currenciesLoading.set(false),
    });
  }

  private loadProviders(): void {
    this.providersLoading.set(true);
    this.financeApi.listPaymentProviders().subscribe({
      next: (providers) => {
        this.providers.set(providers);
        this.providersLoading.set(false);
      },
      error: () => this.providersLoading.set(false),
    });
  }

  private loadMethodConfigs(): void {
    this.methodConfigsLoading.set(true);
    this.financeApi.listPaymentMethodConfigurations().subscribe({
      next: (configs) => {
        this.methodConfigs.set(configs);
        this.methodConfigsLoading.set(false);
      },
      error: () => this.methodConfigsLoading.set(false),
    });
  }

  // ---- Tax Rule actions ----

  openTaxRuleForm(rule?: TaxRule): void {
    this.editingTaxRuleId.set(rule?.id ?? null);
    this.editingTaxRuleRowVersion = rule?.rowVersion ?? null;
    this.taxRuleForm.reset({ name: rule?.name ?? '', percentage: rule?.percentage ?? 0, isActive: rule?.isActive ?? true });
    this.showTaxRuleForm.set(true);
  }

  submitTaxRule(): void {
    if (this.taxRuleForm.invalid) return;
    const raw = this.taxRuleForm.getRawValue();
    const id = this.editingTaxRuleId();

    this.submitting.set(true);
    const save$ = id
      ? this.financeApi.updateTaxRule(id, { ...raw, rowVersion: this.editingTaxRuleRowVersion! })
      : this.financeApi.createTaxRule(raw);

    save$.subscribe({
      next: () => {
        this.toast.success(id ? 'Tax rule updated.' : 'Tax rule created.');
        this.submitting.set(false);
        this.showTaxRuleForm.set(false);
        this.loadTaxRules();
      },
      error: () => this.submitting.set(false),
    });
  }

  deleteTaxRule(id: string): void {
    this.financeApi.deleteTaxRule(id).subscribe({
      next: () => {
        this.toast.success('Tax rule deleted.');
        this.loadTaxRules();
      },
    });
  }

  // ---- Currency actions ----

  openCurrencyForm(currency?: Currency): void {
    this.editingCurrencyId.set(currency?.id ?? null);
    this.editingCurrencyRowVersion = currency?.rowVersion ?? null;
    this.currencyForm.reset({
      code: currency?.code ?? '',
      symbol: currency?.symbol ?? '',
      exchangeRateToBase: currency?.exchangeRateToBase ?? 1,
      isBaseCurrency: currency?.isBaseCurrency ?? false,
      isActive: currency?.isActive ?? true,
    });
    this.showCurrencyForm.set(true);
  }

  submitCurrency(): void {
    if (this.currencyForm.invalid) return;
    const raw = this.currencyForm.getRawValue();
    const request = { ...raw, code: raw.code.toUpperCase() };
    const id = this.editingCurrencyId();

    this.submitting.set(true);
    const save$ = id
      ? this.financeApi.updateCurrency(id, { ...request, rowVersion: this.editingCurrencyRowVersion! })
      : this.financeApi.createCurrency(request);

    save$.subscribe({
      next: () => {
        this.toast.success(id ? 'Currency updated.' : 'Currency created.');
        this.submitting.set(false);
        this.showCurrencyForm.set(false);
        this.loadCurrencies();
      },
      error: () => this.submitting.set(false),
    });
  }

  deleteCurrency(id: string): void {
    this.financeApi.deleteCurrency(id).subscribe({
      next: () => {
        this.toast.success('Currency deleted.');
        this.loadCurrencies();
      },
    });
  }

  // ---- Payment Provider actions ----

  openProviderForm(provider?: PaymentProvider): void {
    this.editingProviderId.set(provider?.id ?? null);
    this.editingProviderRowVersion = provider?.rowVersion ?? null;
    this.providerForm.reset({
      name: provider?.name ?? '',
      code: provider?.code ?? '',
      providerKind: provider?.providerKind ?? 'Gateway',
      gateway: provider?.gateway ?? 'None',
      checkoutBaseUrl: provider?.checkoutBaseUrl ?? '',
      webhookUrl: provider?.webhookUrl ?? '',
      supportsRefund: provider?.supportsRefund ?? true,
      isActive: provider?.isActive ?? true,
    });
    this.showProviderForm.set(true);
  }

  submitProvider(): void {
    if (this.providerForm.invalid) return;
    const raw = this.providerForm.getRawValue();
    const request = {
      ...raw,
      checkoutBaseUrl: raw.checkoutBaseUrl || null,
      webhookUrl: raw.webhookUrl || null,
    };
    const id = this.editingProviderId();

    this.submitting.set(true);
    const save$ = id
      ? this.financeApi.updatePaymentProvider(id, { ...request, rowVersion: this.editingProviderRowVersion! })
      : this.financeApi.createPaymentProvider(request);

    save$.subscribe({
      next: () => {
        this.toast.success(id ? 'Provider updated.' : 'Provider created.');
        this.submitting.set(false);
        this.showProviderForm.set(false);
        this.loadProviders();
      },
      error: () => this.submitting.set(false),
    });
  }

  deleteProvider(id: string): void {
    this.financeApi.deletePaymentProvider(id).subscribe({
      next: () => {
        this.toast.success('Provider deleted.');
        this.loadProviders();
      },
    });
  }

  // ---- Payment Method Configuration actions ----

  openMethodConfigForm(config?: PaymentMethodConfiguration): void {
    this.editingMethodConfigId.set(config?.id ?? null);
    this.editingMethodConfigRowVersion = config?.rowVersion ?? null;
    this.methodConfigForm.reset({
      paymentProviderId: config?.paymentProviderId ?? '',
      method: config?.method ?? 'OnlineGateway',
      displayName: config?.displayName ?? '',
      fixedFee: config?.fixedFee ?? null,
      percentageFee: config?.percentageFee ?? null,
      isActive: config?.isActive ?? true,
    });
    this.showMethodConfigForm.set(true);
  }

  submitMethodConfig(): void {
    if (this.methodConfigForm.invalid) return;
    const raw = this.methodConfigForm.getRawValue();
    const id = this.editingMethodConfigId();

    this.submitting.set(true);
    const save$ = id
      ? this.financeApi.updatePaymentMethodConfiguration(id, { ...raw, rowVersion: this.editingMethodConfigRowVersion! })
      : this.financeApi.createPaymentMethodConfiguration(raw);

    save$.subscribe({
      next: () => {
        this.toast.success(id ? 'Payment method updated.' : 'Payment method created.');
        this.submitting.set(false);
        this.showMethodConfigForm.set(false);
        this.loadMethodConfigs();
      },
      error: () => this.submitting.set(false),
    });
  }

  deleteMethodConfig(id: string): void {
    this.financeApi.deletePaymentMethodConfiguration(id).subscribe({
      next: () => {
        this.toast.success('Payment method deleted.');
        this.loadMethodConfigs();
      },
    });
  }
}

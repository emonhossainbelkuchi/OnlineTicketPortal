import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CustomerWalletTransaction, OperatorWallet, PlatformLedger } from '@ticketportal-mono/models';
import { TpCardComponent, TpSpinnerComponent, TpTableColumn, TpTableComponent, TpTabsComponent } from '../../../shared/ui';
import { FinanceApiService } from '../services/finance-api.service';
import { OperatorLookupService } from '../services/operator-lookup.service';
import { OperatorFilterComponent } from '../shared/operator-filter.component';
import { formatDate, formatMoney } from '../shared/money.util';

interface WalletRow {
  [key: string]: unknown;
  operatorName: string;
  onlineSalesDisplay: string;
  counterSalesDisplay: string;
  pendingSettlementDisplay: string;
  availablePayoutDisplay: string;
  withdrawnDisplay: string;
  statusDisplay: string;
}

interface LedgerRow {
  [key: string]: unknown;
  ledgerNo: string;
  operatorName: string;
  itemType: string;
  saleChannel: string;
  debitDisplay: string;
  creditDisplay: string;
  createdAt: string;
  description: string;
}

interface CustomerWalletRow {
  [key: string]: unknown;
  transactionType: string;
  amountDisplay: string;
  balanceAfterDisplay: string;
  createdAt: string;
  description: string;
}

/**
 * Screen 2 — everyone's running balance. OperatorWallet's lifetime
 * accumulators (withdrawn/total commission/etc) vs. its "right now" figures
 * (pending settlement / available payout) are called out explicitly per the
 * model's own field comments (see finance.model.ts) since it's an easy mix-up.
 */
@Component({
  selector: 'tp-wallets-ledger',
  standalone: true,
  imports: [
    CommonModule,
    TpCardComponent,
    TpTableComponent,
    TpTabsComponent,
    TpSpinnerComponent,
    OperatorFilterComponent,
  ],
  template: `
    <tp-card>
      <h3>Wallets &amp; Ledger</h3>
      <p class="tp-muted">Operator running balances, the platform money diary, and customer wallet activity.</p>

      <tp-tabs
        [tabs]="['Operator Wallets', 'Platform Ledger', 'Customer Wallet Activity']"
        [activeIndex]="activeTab"
        (activeIndexChange)="onTabChange($event)"
      />

      @switch (activeTab) {
        @case (0) {
          @if (walletsLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table
              [columns]="walletColumns"
              [rows]="walletRows()"
              emptyTitle="No operator wallets yet"
              emptyMessage="A wallet is created automatically the first time an operator has a sale recorded."
            />
          }
        }
        @case (1) {
          <div class="tp-panel-filter">
            <tp-operator-filter [value]="ledgerOperatorId()" (valueChange)="onLedgerOperatorChange($event)" />
          </div>
          @if (ledgerLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table
              [columns]="ledgerColumns"
              [rows]="ledgerRows()"
              emptyTitle="No ledger entries"
              emptyMessage="Every online sale, refund, and counter-sale commission posts a ledger entry here."
            />
          }
        }
        @case (2) {
          @if (customerLoading()) {
            <div class="tp-panel-loading"><tp-spinner /></div>
          } @else {
            <tp-table
              [columns]="customerColumns"
              [rows]="customerRows()"
              emptyTitle="No customer wallet activity"
            />
          }
        }
      }
    </tp-card>
  `,
  styles: [
    `
      h3 {
        margin-bottom: var(--tp-space-1);
      }

      .tp-panel-loading {
        display: flex;
        justify-content: center;
        padding: var(--tp-space-7) 0;
      }

      .tp-panel-filter {
        margin-bottom: var(--tp-space-4);
      }
    `,
  ],
})
export class WalletsLedgerComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);
  protected readonly operatorLookup = inject(OperatorLookupService);

  activeTab = 0;

  protected readonly walletColumns: TpTableColumn[] = [
    { key: 'operatorName', label: 'Operator' },
    { key: 'onlineSalesDisplay', label: 'Online Sales', align: 'right' },
    { key: 'counterSalesDisplay', label: 'Counter Sales', align: 'right' },
    { key: 'pendingSettlementDisplay', label: 'Pending Settlement', align: 'right' },
    { key: 'availablePayoutDisplay', label: 'Available Payout', align: 'right' },
    { key: 'withdrawnDisplay', label: 'Withdrawn (lifetime)', align: 'right' },
    { key: 'statusDisplay', label: 'Status' },
  ];

  protected readonly ledgerColumns: TpTableColumn[] = [
    { key: 'ledgerNo', label: 'Ledger No.' },
    { key: 'operatorName', label: 'Operator' },
    { key: 'itemType', label: 'Type' },
    { key: 'saleChannel', label: 'Channel' },
    { key: 'debitDisplay', label: 'Debit', align: 'right' },
    { key: 'creditDisplay', label: 'Credit', align: 'right' },
    { key: 'createdAt', label: 'Date' },
    { key: 'description', label: 'Description' },
  ];

  protected readonly customerColumns: TpTableColumn[] = [
    { key: 'transactionType', label: 'Type' },
    { key: 'amountDisplay', label: 'Amount', align: 'right' },
    { key: 'balanceAfterDisplay', label: 'Balance After', align: 'right' },
    { key: 'createdAt', label: 'Date' },
    { key: 'description', label: 'Description' },
  ];

  private readonly wallets = signal<OperatorWallet[]>([]);
  private readonly ledgerEntries = signal<PlatformLedger[]>([]);
  private readonly customerTransactions = signal<CustomerWalletTransaction[]>([]);

  protected readonly walletsLoading = signal(false);
  protected readonly ledgerLoading = signal(false);
  protected readonly customerLoading = signal(false);
  protected readonly ledgerOperatorId = signal<string | null>(null);

  private customerLoaded = false;

  protected readonly walletRows = computed<WalletRow[]>(() =>
    this.wallets().map((wallet) => ({
      operatorName: this.operatorLookup.nameFor(wallet.busOperatorId),
      onlineSalesDisplay: formatMoney(wallet.totalOnlineSalesAmount),
      counterSalesDisplay: formatMoney(wallet.totalCounterSalesAmount),
      pendingSettlementDisplay: formatMoney(wallet.pendingSettlementBalance),
      availablePayoutDisplay: formatMoney(wallet.availablePayoutBalance),
      withdrawnDisplay: formatMoney(wallet.withdrawnAmount),
      statusDisplay: wallet.isActive ? 'Active' : 'Inactive',
    })),
  );

  protected readonly ledgerRows = computed<LedgerRow[]>(() =>
    this.ledgerEntries().map((entry) => ({
      ledgerNo: entry.ledgerNo,
      operatorName: this.operatorLookup.nameFor(entry.busOperatorId),
      itemType: entry.itemType,
      saleChannel: entry.saleChannel ?? '—',
      debitDisplay: formatMoney(entry.debitAmount, entry.currency),
      creditDisplay: formatMoney(entry.creditAmount, entry.currency),
      createdAt: formatDate(entry.createdAtUtc),
      description: entry.description ?? '—',
    })),
  );

  protected readonly customerRows = computed<CustomerWalletRow[]>(() =>
    this.customerTransactions().map((txn) => ({
      transactionType: txn.transactionType,
      amountDisplay: formatMoney(txn.amount, txn.currency),
      balanceAfterDisplay: formatMoney(txn.balanceAfter, txn.currency),
      createdAt: formatDate(txn.createdAtUtc),
      description: txn.description ?? '—',
    })),
  );

  ngOnInit(): void {
    this.operatorLookup.ensureLoaded();
    this.loadWallets();
    this.loadLedger();
  }

  private loadWallets(): void {
    this.walletsLoading.set(true);
    this.financeApi.listWallets().subscribe({
      next: (wallets) => {
        this.wallets.set(wallets);
        this.walletsLoading.set(false);
      },
      error: () => this.walletsLoading.set(false),
    });
  }

  private loadLedger(): void {
    this.ledgerLoading.set(true);
    this.financeApi.listLedgerEntries(this.ledgerOperatorId()).subscribe({
      next: (entries) => {
        this.ledgerEntries.set(entries);
        this.ledgerLoading.set(false);
      },
      error: () => this.ledgerLoading.set(false),
    });
  }

  private loadCustomerActivity(): void {
    this.customerLoaded = true;
    this.customerLoading.set(true);
    this.financeApi.listCustomerWalletTransactions().subscribe({
      next: (transactions) => {
        this.customerTransactions.set(transactions);
        this.customerLoading.set(false);
      },
      error: () => this.customerLoading.set(false),
    });
  }

  onLedgerOperatorChange(operatorId: string | null): void {
    this.ledgerOperatorId.set(operatorId);
    this.loadLedger();
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    if (index === 2 && !this.customerLoaded) {
      this.loadCustomerActivity();
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CustomerProfile, CustomerWalletTransaction } from '@ticketportal-mono/models';
import { ApiService } from '../../../../core/services/api.service';
import { TpCardComponent, TpSpinnerComponent, TpTableColumn, TpTableComponent } from '../../../../shared/ui';
import { AccountNavComponent } from '../account-nav/account-nav.component';

interface TransactionRow extends Record<string, unknown> {
  dateDisplay: string;
  typeDisplay: string;
  amountDisplay: string;
  balanceDisplay: string;
  description: string;
}

@Component({
  selector: 'tp-wallet',
  standalone: true,
  imports: [CommonModule, AccountNavComponent, TpCardComponent, TpTableComponent, TpSpinnerComponent],
  template: `
    <div class="tp-page tp-wallet-page">
      <h2>My Account</h2>
      <tp-account-nav />

      @if (loading()) {
        <tp-spinner size="lg" />
      } @else {
        <tp-card class="tp-balance-card">
          <p class="tp-muted">Wallet Balance</p>
          <p class="tp-balance-amount">{{ balance() | number: '1.2-2' }} BDT</p>
        </tp-card>

        <h3>Transaction History</h3>
        <tp-table
          [columns]="columns"
          [rows]="rows()"
          emptyTitle="No wallet activity yet"
          emptyMessage="Top-ups, booking payments, and refund credits will show up here."
        />
      }
    </div>
  `,
  styles: [
    `
      .tp-balance-card {
        margin-bottom: var(--tp-space-5);
        text-align: center;
      }

      .tp-balance-card p:first-child {
        margin-bottom: var(--tp-space-2);
      }

      .tp-balance-amount {
        font-size: 32px;
        font-weight: 700;
        margin: 0;
      }
    `,
  ],
})
export class WalletComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly loading = signal(true);
  protected readonly balance = signal(0);
  protected readonly rows = signal<TransactionRow[]>([]);

  protected readonly columns: TpTableColumn[] = [
    { key: 'dateDisplay', label: 'Date' },
    { key: 'typeDisplay', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'amountDisplay', label: 'Amount', align: 'right' },
    { key: 'balanceDisplay', label: 'Balance After', align: 'right' },
  ];

  ngOnInit(): void {
    this.api.get<CustomerProfile[]>('customerprofiles').subscribe({
      next: (profiles) => this.balance.set(profiles[0]?.walletBalance ?? 0),
    });

    this.api.get<CustomerWalletTransaction[]>('customerwallettransactions').subscribe({
      next: (transactions) => {
        this.rows.set(
          transactions
            .slice()
            .sort((a, b) => (a.createdAtUtc < b.createdAtUtc ? 1 : -1))
            .map((t) => ({
              dateDisplay: new Date(t.createdAtUtc).toLocaleDateString(),
              typeDisplay: t.transactionType,
              amountDisplay: `${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)} ${t.currency}`,
              balanceDisplay: `${t.balanceAfter.toFixed(2)} ${t.currency}`,
              description: t.description ?? '—',
            })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

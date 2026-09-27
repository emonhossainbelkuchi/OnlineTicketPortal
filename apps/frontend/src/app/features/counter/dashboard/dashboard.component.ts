import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CounterDashboard } from '@ticketportal-mono/models';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent } from '../../../shared/ui';
import { DashboardService } from '../services/dashboard.service';

/**
 * Chunk 6 task 1 — the counter desk's default landing screen
 * (counter.routes.ts redirects '' here). One glance at: today's tickets,
 * cash collected, and anything waiting on the clerk (pending cancellations,
 * open complaints) — then one tap into a new walk-in sale. All figures come
 * from a single scoped server aggregate (GET 'salescounters/dashboard') so
 * this screen never has to download full booking/cancellation/complaint
 * lists just to count them.
 */
@Component({
  selector: 'tp-counter-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink, TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpSpinnerComponent],
  template: `
    <div class="tp-dashboard__header">
      <div>
        <h2>Counter Dashboard</h2>
        <p class="tp-muted">{{ dashboard()?.date ?? today }}</p>
      </div>
      <button tpButton variant="primary" routerLink="../walk-in">New Walk-in Sale</button>
    </div>

    @if (loading()) {
      <tp-card><tp-spinner /> Loading today's figures…</tp-card>
    } @else if (dashboard(); as d) {
      <div class="tp-dashboard__stats">
        <tp-card class="tp-stat">
          <span class="tp-stat__label">Tickets sold today</span>
          <span class="tp-stat__value">{{ d.ticketsSoldToday }}</span>
        </tp-card>
        <tp-card class="tp-stat">
          <span class="tp-stat__label">Cash sales total</span>
          <span class="tp-stat__value">{{ d.currency }} {{ d.cashSalesTotal | number: '1.2-2' }}</span>
        </tp-card>
        <tp-card class="tp-stat" [class.tp-stat--attention]="d.pendingCancellations > 0">
          <span class="tp-stat__label">Pending cancellations</span>
          <span class="tp-stat__value">{{ d.pendingCancellations }}</span>
        </tp-card>
        <tp-card class="tp-stat" [class.tp-stat--attention]="d.openComplaints > 0">
          <span class="tp-stat__label">Open complaints</span>
          <span class="tp-stat__value">{{ d.openComplaints }}</span>
        </tp-card>
      </div>

      @if (d.counters.length > 1) {
        <tp-card>
          <h4>By counter</h4>
          <table class="tp-dashboard__table">
            <thead>
              <tr>
                <th>Counter</th>
                <th>Tickets</th>
                <th>Cash total</th>
              </tr>
            </thead>
            <tbody>
              @for (c of d.counters; track c.counterId) {
                <tr>
                  <td>{{ c.counterName }} <span class="tp-muted">({{ c.counterCode }})</span></td>
                  <td>{{ c.ticketsSoldToday }}</td>
                  <td>{{ d.currency }} {{ c.cashSalesTotal | number: '1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </tp-card>
      } @else if (d.counters.length === 0) {
        <tp-empty-state
          title="No counter assigned yet"
          message="Ask an operator manager to assign you to a sales counter before you can take walk-in sales."
        />
      }
    }
  `,
  styles: [
    `
      .tp-dashboard__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--tp-space-3);
        margin-bottom: var(--tp-space-4);
      }

      .tp-dashboard__header h2 {
        margin: 0 0 var(--tp-space-1);
      }

      .tp-dashboard__stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: var(--tp-space-3);
        margin-bottom: var(--tp-space-4);
      }

      .tp-stat {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-1);
      }

      .tp-stat__label {
        color: var(--tp-text-muted);
        font-size: 0.875rem;
      }

      .tp-stat__value {
        font-size: 1.75rem;
        font-weight: 700;
      }

      .tp-stat--attention .tp-stat__value {
        color: var(--tp-danger, #c0392b);
      }

      .tp-dashboard__table {
        width: 100%;
        border-collapse: collapse;
      }

      .tp-dashboard__table th,
      .tp-dashboard__table td {
        text-align: left;
        padding: var(--tp-space-2) var(--tp-space-2);
        border-bottom: 1px solid var(--tp-border, #e5e5e5);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  protected readonly loading = signal(true);
  protected readonly dashboard = signal<CounterDashboard | null>(null);
  protected readonly today = new Date().toDateString();

  ngOnInit(): void {
    this.dashboardService.getDashboard().subscribe({
      next: (d) => {
        this.dashboard.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

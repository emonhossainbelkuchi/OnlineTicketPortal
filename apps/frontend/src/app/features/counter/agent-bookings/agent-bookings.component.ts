import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Agent } from '@ticketportal-mono/models';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TpButtonDirective, TpCardComponent, TpEmptyStateComponent, TpModalComponent, TpSpinnerComponent, TpStatusPillComponent } from '../../../shared/ui';
import { AgentsService } from '../services/agents.service';

/**
 * Piece 5, screen 3 — agent roster (phone/agency sales partners). CRUD
 * against AgentsController. See AgentsService's doc comment: there is no
 * backend hook yet to attribute an actual booking to one of these agents,
 * so this screen is the directory + commission terms only, with a banner
 * pointing that out rather than pretending a "book for this agent" flow
 * exists.
 */
@Component({
  selector: 'tp-agent-bookings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TpButtonDirective,
    TpCardComponent,
    TpEmptyStateComponent,
    TpModalComponent,
    TpSpinnerComponent,
    TpStatusPillComponent,
  ],
  template: `
    <div class="tp-gap-banner">
      <strong>Heads up:</strong> bookings can't be attributed to an agent yet — <code>BookingCreateDto</code>
      has no <code>agentId</code> field on the backend today. Use this screen to manage the agent roster and
      commission terms; sell an agent-referred ticket through
      <a routerLink="../walk-in">Walk-in Booking</a> as a regular counter sale for now.
    </div>

    <tp-card>
      <div class="tp-toolbar">
        <h2>Agents</h2>
        <button tpButton variant="primary" (click)="openCreate()">+ New Agent</button>
      </div>

      @if (loading()) {
        <tp-spinner />
      } @else if (agents().length === 0) {
        <tp-empty-state title="No agents yet" message="Register your first phone/agency sales partner.">
          <button tpButton variant="primary" (click)="openCreate()">+ New Agent</button>
        </tp-empty-state>
      } @else {
        <div class="tp-table-wrap">
          <table class="tp-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Agency Code</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Commission</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (agent of agents(); track agent.id) {
                <tr>
                  <td>{{ agent.name }}</td>
                  <td>{{ agent.agencyCode }}</td>
                  <td>{{ agent.contactPerson }}</td>
                  <td>{{ agent.phoneNumber }}</td>
                  <td>{{ agent.commissionPercentage }}%</td>
                  <td><tp-status-pill [status]="agent.isActive ? 'Active' : 'Inactive'" /></td>
                  <td class="tp-table__actions">
                    <button tpButton variant="ghost" size="sm" (click)="openEdit(agent)">Edit</button>
                    <button tpButton variant="danger" size="sm" (click)="remove(agent)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </tp-card>

    <tp-modal [open]="modalOpen()" [title]="editing() ? 'Edit Agent' : 'New Agent'" (closed)="closeModal()">
      <form [formGroup]="form" class="tp-form" (ngSubmit)="save()">
        @if (auth.hasRole('Admin') && !editing()) {
          <label>
            Bus Operator ID <span class="tp-muted">(leave blank for a platform-wide agent)</span>
            <input type="text" formControlName="busOperatorId" placeholder="Operator GUID" />
          </label>
        }
        <label>
          Agency Name
          <input type="text" formControlName="name" />
        </label>
        <label>
          Agency Code
          <input type="text" formControlName="agencyCode" />
        </label>
        <label>
          Contact Person
          <input type="text" formControlName="contactPerson" />
        </label>
        <label>
          Phone Number
          <input type="text" formControlName="phoneNumber" />
        </label>
        <label>
          Email
          <input type="email" formControlName="email" />
        </label>
        <label>
          Address
          <input type="text" formControlName="address" />
        </label>
        <label>
          Commission %
          <input type="number" step="0.01" min="0" max="100" formControlName="commissionPercentage" />
        </label>
        <label class="tp-checkbox">
          <input type="checkbox" formControlName="isActive" />
          Active
        </label>
      </form>
      <div modal-footer>
        <button tpButton variant="secondary" (click)="closeModal()">Cancel</button>
        <button tpButton variant="primary" [disabled]="form.invalid || saving()" (click)="save()">
          {{ saving() ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </tp-modal>
  `,
  styles: [
    `
      .tp-gap-banner {
        background: var(--tp-warning-tint);
        color: #8a5a00;
        border: 1px solid var(--tp-warning);
        border-radius: var(--tp-radius-md);
        padding: var(--tp-space-4);
        font-size: 13px;
        margin-bottom: var(--tp-space-5);
      }

      .tp-gap-banner a {
        color: inherit;
        font-weight: 600;
        text-decoration: underline;
      }

      .tp-gap-banner code {
        background: rgba(0, 0, 0, 0.06);
        padding: 1px 4px;
        border-radius: 4px;
      }

      .tp-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--tp-space-5);
      }

      .tp-toolbar h2 {
        margin: 0;
      }

      .tp-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-md);
      }

      .tp-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      .tp-table th {
        background: var(--tp-bg-soft);
        color: var(--tp-text-muted);
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
        text-align: left;
      }

      .tp-table td {
        padding: var(--tp-space-3) var(--tp-space-4);
        border-bottom: 1px solid var(--tp-border);
      }

      .tp-table tbody tr:last-child td {
        border-bottom: none;
      }

      .tp-table__actions {
        display: flex;
        gap: var(--tp-space-2);
        justify-content: flex-end;
      }

      .tp-form {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-4);
      }

      .tp-form label {
        display: flex;
        flex-direction: column;
        gap: var(--tp-space-2);
        font-size: 13px;
        font-weight: 600;
        color: var(--tp-text-muted);
      }

      .tp-form input {
        border: 1px solid var(--tp-border);
        border-radius: var(--tp-radius-sm);
        padding: 10px var(--tp-space-3);
        font-size: 14px;
        font-family: var(--tp-font-body);
        color: var(--tp-text);
      }

      .tp-form input:focus {
        outline: none;
        border-color: var(--tp-yellow-dark);
        box-shadow: 0 0 0 3px var(--tp-yellow-tint);
      }

      .tp-checkbox {
        flex-direction: row !important;
        align-items: center;
        gap: var(--tp-space-2) !important;
      }
    `,
  ],
})
export class AgentBookingsComponent implements OnInit {
  private readonly agentsService = inject(AgentsService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Agent | null>(null);
  protected readonly agents = signal<Agent[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    busOperatorId: [''],
    name: ['', Validators.required],
    agencyCode: ['', Validators.required],
    contactPerson: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    email: [''],
    address: ['', Validators.required],
    commissionPercentage: [5, [Validators.required, Validators.min(0), Validators.max(100)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      busOperatorId: '',
      name: '',
      agencyCode: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
      address: '',
      commissionPercentage: 5,
      isActive: true,
    });
    this.modalOpen.set(true);
  }

  protected openEdit(agent: Agent): void {
    this.editing.set(agent);
    this.form.reset({
      busOperatorId: agent.busOperatorId ?? '',
      name: agent.name,
      agencyCode: agent.agencyCode,
      contactPerson: agent.contactPerson,
      phoneNumber: agent.phoneNumber,
      email: agent.email ?? '',
      address: agent.address,
      commissionPercentage: agent.commissionPercentage,
      isActive: agent.isActive,
    });
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const editing = this.editing();

    const request$ = editing
      ? this.agentsService.update(editing.id, {
          name: raw.name,
          agencyCode: raw.agencyCode,
          contactPerson: raw.contactPerson,
          phoneNumber: raw.phoneNumber,
          email: raw.email || undefined,
          address: raw.address,
          commissionPercentage: raw.commissionPercentage,
          isActive: raw.isActive,
          rowVersion: editing.rowVersion,
        })
      : this.agentsService.create({
          busOperatorId: raw.busOperatorId || undefined,
          name: raw.name,
          agencyCode: raw.agencyCode,
          contactPerson: raw.contactPerson,
          phoneNumber: raw.phoneNumber,
          email: raw.email || undefined,
          address: raw.address,
          commissionPercentage: raw.commissionPercentage,
          isActive: raw.isActive,
        });

    request$.subscribe({
      next: () => {
        this.toast.success(editing ? 'Agent updated.' : 'Agent created.');
        this.saving.set(false);
        this.modalOpen.set(false);
        this.refresh();
      },
      error: () => this.saving.set(false),
    });
  }

  protected remove(agent: Agent): void {
    if (!confirm(`Delete agent "${agent.name}"?`)) return;

    this.agentsService.delete(agent.id).subscribe(() => {
      this.toast.success('Agent deleted.');
      this.refresh();
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.agentsService.list().subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

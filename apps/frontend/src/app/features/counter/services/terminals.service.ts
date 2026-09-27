import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Terminal } from '@ticketportal-mono/models';

/**
 * GET /api/terminals — open to any logged-in user (TerminalsController).
 * Used for the from/to picker in the walk-in booking search and for
 * boarding/dropping terminal selection when creating a counter-sale
 * booking. Read-only from this piece — Terminal creation is Admin-only.
 */
@Injectable({ providedIn: 'root' })
export class TerminalsService {
  private readonly api = inject(ApiService);

  list(): Observable<Terminal[]> {
    return this.api.get<Terminal[]>('terminals');
  }
}

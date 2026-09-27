import { Component } from '@angular/core';
import { TpCardComponent, TpButtonDirective } from '../../shared/ui';

/**
 * The Platform Admin Dashboard (Piece 7) is a SEPARATE React application
 * per the frontend guideline — it is not part of this Angular workspace.
 * This page just points an Admin-role user at it instead of a dead link.
 * Piece 7's owner: update ADMIN_APP_URL once the React app has a real
 * deployed/dev URL.
 */
const ADMIN_APP_URL = 'http://localhost:5173';

@Component({
  selector: 'tp-admin-redirect',
  standalone: true,
  imports: [TpCardComponent, TpButtonDirective],
  template: `
    <div class="tp-page">
      <tp-card>
        <h2>Platform Admin Dashboard</h2>
        <p class="tp-muted">
          The Admin Dashboard is a separate React application (Piece 7), not part of this Angular app.
          Update the URL below once it's deployed.
        </p>
        <a [href]="adminUrl" target="_blank" rel="noopener">
          <button tpButton variant="primary">Open Admin Dashboard</button>
        </a>
      </tp-card>
    </div>
  `,
})
export class AdminRedirectComponent {
  protected readonly adminUrl = ADMIN_APP_URL;
}

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Attaches `Authorization: Bearer <token>` to every request that targets
 * our own API. Register/Login work fine either way ([AllowAnonymous] on the
 * backend), so there's no need to special-case them.
 *
 * Requests to a different host (e.g. a future payment-gateway redirect) are
 * left untouched — we never want to leak our token to a third party.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const token = authService.getToken();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};

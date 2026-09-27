import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { ApiError } from '@ticketportal-mono/models';

/**
 * Single place that turns the backend's several different error body shapes
 * (see api-error.model.ts for why there's more than one) into the one
 * ApiError shape the rest of the app relies on, shows a toast, and rethrows
 * so a component can still react to a specific failure if it needs to
 * (e.g. a form highlighting a field-level validation error).
 *
 * Also owns the global 401 -> log out -> redirect to login behavior, so
 * individual feature modules never have to special-case an expired session.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      const apiError = normalizeError(err);

      // A 401 from the sign-in/sign-up calls themselves means "wrong credentials" or "account
      // disabled", not "your session ran out": show the server's message and stay on the page.
      // (Every failed login used to say "Your session has expired" and bounce to /auth/login
      // with returnUrl=/auth/login.)
      const isCredentialCall = /\/account\/(login|register|forgot-password|reset-password)(\?|$)/i.test(req.url);

      if (apiError.status === 401 && isCredentialCall) {
        toast.error(apiError.message);
      } else if (apiError.status === 401) {
        authService.logout();
        toast.error('Your session has expired. Please log in again.');
        router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
      } else if (apiError.status === 403) {
        toast.error("You don't have permission to do that.");
      } else if (apiError.status === 0) {
        toast.error('Cannot reach the server. Is the backend running?');
      } else {
        toast.error(apiError.message);
      }

      return throwError(() => apiError);
    }),
  );
};

function normalizeError(err: HttpErrorResponse): ApiError {
  const status = err.status;
  const body = err.error;

  // Shape 1: global unhandled-exception handler -> { message: "..." }
  if (body && typeof body === 'object' && typeof body.message === 'string') {
    return { status, message: body.message };
  }

  // Shape 2: ASP.NET automatic model-validation 400 ->
  // { title, status, errors: { Field: ["msg", ...] } }
  if (body && typeof body === 'object' && body.errors && typeof body.errors === 'object') {
    const fieldErrors = body.errors as Record<string, string[]>;
    const firstMessage = Object.values(fieldErrors).flat()[0];
    return {
      status,
      message: firstMessage || body.title || 'Please check the highlighted fields.',
      fieldErrors,
    };
  }

  // Shape 4: an array of strings, e.g. Identity's password/username errors.
  if (Array.isArray(body) && body.every((x) => typeof x === 'string')) {
    return { status, message: body.join(' ') };
  }

  // Shape 3: a plain string body (Unauthorized("..."), BadRequest("...")).
  if (typeof body === 'string' && body.trim().length > 0) {
    return { status, message: body };
  }

  // No usable body at all (e.g. bare 404/204), or something we didn't
  // anticipate — fall back to a generic, still-useful message.
  return { status, message: err.message || 'Something went wrong. Please try again.' };
}

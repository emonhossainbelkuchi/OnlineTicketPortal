import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Increments/decrements LoadingService's counter around every request so
 * the top-of-page progress bar in ShellComponent "just works" for every
 * feature module without them wiring up their own spinners for basic
 * page-level loads. Use a local loading flag instead for anything more
 * granular (e.g. a single button's own busy state).
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};

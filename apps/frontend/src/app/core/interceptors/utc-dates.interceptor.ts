import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { markUtc } from '../utils/utc';

/**
 * Adds the missing "Z" to every timezone-less "...Utc" timestamp in a JSON response body, so
 * the browser reads it as UTC instead of local time. See core/utils/utc.ts for the full story.
 * Registered LAST in app.config.ts, i.e. closest to the network, so every other interceptor and
 * every component only ever sees corrected values.
 */
export const utcDatesInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event: HttpEvent<unknown>) =>
      event instanceof HttpResponse && event.body !== null && typeof event.body === 'object'
        ? event.clone({ body: markUtc(event.body) })
        : event,
    ),
  );

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';

import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { utcDatesInterceptor } from './core/interceptors/utc-dates.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    // Order matters: loading starts first (outermost), then auth attaches
    // the token, then error normalizes whatever comes back last. utcDatesInterceptor sits
    // closest to the network so it fixes the timezone-less "...Utc" timestamps before anything
    // else sees a response.
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor, utcDatesInterceptor])),
    // Angular Material (tab nav bar, form fields, datepicker, button ripple)
    // needs the animations driver and a date adapter for mat-datepicker.
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
  ],
};

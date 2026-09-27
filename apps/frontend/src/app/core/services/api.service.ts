import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Thin wrapper over HttpClient that:
 *  - prefixes every call with environment.apiBaseUrl, so feature modules
 *    never hardcode a URL
 *  - turns a plain object into HttpParams (skipping null/undefined values)
 *    so callers don't hand-build query strings
 *
 * The AuthInterceptor attaches the bearer token and the ErrorInterceptor
 * normalizes failures — this service doesn't need to know about either.
 *
 * Usage from a feature module:
 *   this.api.get<TripSearchResult[]>('trips/search', { fromTerminalId, toTerminalId, date })
 *   this.api.post<Booking>('bookings', createRequest)
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.buildParams(params) });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  /**
   * multipart/form-data POST — for the handful of `{id}/images` endpoints that bind an
   * `IFormFile` (BusOperators logo, Buses/Trips cover image). Pass the raw File; this wraps it
   * in a FormData under the `file` field name the backend model-binds to. Don't set a
   * Content-Type header yourself — HttpClient derives the multipart boundary from the FormData.
   */
  postForm<T>(path: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(this.url(path), formData);
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}/${cleanPath}`;
  }

  /**
   * Uploaded images (Bus/Trip/BusOperator logo) come back as a server-relative path like
   * "/images/xyz.png", not a full URL — resolve it against the API's origin (not apiBaseUrl,
   * which has a trailing "/api" that would double up) for use in an <img src>. Returns null
   * unchanged so templates can `*ngIf` on it directly.
   */
  resolveAssetUrl(relativeUrl: string | null | undefined): string | null {
    if (!relativeUrl) return null;
    if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
    const origin = this.baseUrl.replace(/\/api\/?$/, '');
    return `${origin}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
  }

  private buildParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}

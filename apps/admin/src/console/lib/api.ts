import axios from 'axios';
import { clearSession, getStoredSession } from '../../lib/apiClient';
import { saveBusOperator, deleteBusOperatorById } from '@/services/busOperatorService';
import type { BusOperator, OperatorRoute } from '@/services/busOperatorService';

export type { BusOperator, OperatorRoute };

/**
 * Origin of the ASP.NET API WITHOUT the "/api" suffix. The management-console services
 * were written as `${API_BASE_URL}/api/Trips` / `api.get('/api/Terminals')`, while the admin
 * app's shared .env files hold `https://localhost:54221/api` (that is what apiClient.ts
 * expects) - so the suffix is stripped here and both styles keep working off ONE env var.
 */
export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:54221/api')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export const api = axios.create({ baseURL: API_BASE_URL });
export default api;

// One login for the whole admin app: the token comes from the session the admin login page
// stored (tp_admin_auth), instead of the console keeping a second, separate login.
api.interceptors.request.use((config) => {
  const session = getStoredSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

export interface ApiError {
  status: number;
  message: string;
  details?: string;
  raw?: unknown;
  response?: any;
}

// ASP.NET returns several error body shapes; this covers the ones this API actually emits:
// { message }, ValidationProblemDetails { errors: { Field: [msgs] } }, ["msg", ...], "msg".
function friendlyMessage(status: number, data: any): string {
  if (data && typeof data === 'object' && typeof data.message === 'string') return data.message;
  if (data && typeof data === 'object' && data.errors && typeof data.errors === 'object') {
    const first = (Object.values(data.errors).flat() as string[])[0];
    if (first) return first;
  }
  if (Array.isArray(data) && data.length > 0 && data.every((x) => typeof x === 'string')) return data.join(' ');
  if (typeof data === 'string' && data.trim().length > 0 && data.length < 300) return data;
  switch (status) {
    case 0: return `Cannot reach the API at ${API_BASE_URL}. Is it running, and does the browser trust its https certificate?`;
    case 400: return 'This request is invalid. Please check the form and try again.';
    case 401: return 'Your session has expired. Please log in again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested item could not be found.';
    case 409: return 'This data was changed by another user. Please refresh and try again.';
    case 422: return 'Some fields did not pass validation.';
    case 500: return 'Something went wrong on the server. Please try again shortly.';
    default: return 'Something went wrong. Please try again.';
  }
}

api.interceptors.response.use(
  (res) => {
    // Keep the console's small BusOperator lookup cache (used by dropdowns that read it
    // synchronously) in step with what the REAL API just returned. Only real responses are
    // ever written here - there are no fabricated fallbacks any more (see NOTE below).
    try {
      const url = (res.config?.url || '').toLowerCase();
      const method = (res.config?.method || 'get').toLowerCase();
      if (url.includes('busoperators') && !url.includes('/images')) {
        if (method === 'delete') {
          const id = url.split('?')[0].split('/').filter(Boolean).pop();
          if (id) deleteBusOperatorById(id);
        } else if (Array.isArray(res.data)) {
          res.data.forEach((item: any) => item?.id && item?.name && saveBusOperator(item));
        } else if (res.data && res.data.id && res.data.name) {
          saveBusOperator(res.data);
        }
      }
    } catch (e) {
      console.warn('Operator cache sync warning:', e);
    }
    return res;
  },
  (error) => {
    // NOTE: the original prototype answered network failures by INVENTING data (hard-coded
    // routes/terminals, and "successfully" creating/updating/deleting BusOperators in
    // localStorage while the API was down). For a real admin console that is dangerous - a
    // change looked saved when nothing reached the database - so a failed request now fails.
    const status: number = error?.response?.status ?? 0;
    const data = error?.response?.data;
    const message = friendlyMessage(status, data);
    const normalized: ApiError = {
      status,
      message,
      details: typeof data === 'string' ? data : data?.details,
      raw: data,
      response: error?.response || { status, data: { message } },
    };

    if (status === 401) {
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalized);
  },
);

// Trip API service — matches TripsController exactly:
// GET (open to everyone, AllowAnonymous), GET/{id} (AllowAnonymous), GET/search
// (AllowAnonymous), POST/PUT (operator-scoped via CanManageOperatorAsync), DELETE
// (operator-scoped, soft-deletes+cancels instead of hard-deleting if Bookings exist),
// POST/{id}/images (multipart upload, operator-scoped).
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api';
import {
  Trip,
  TripCreateDto,
  TripUpdateDto,
  TripSearchResult,
  TripSearchParams,
} from '@/types/trip.types';

const BASE_URL = `${API_BASE_URL}/api/Trips`;

export const tripService = {
  getAll: async (): Promise<Trip[]> => {
    const res = await axios.get<Trip[]>(BASE_URL);
    return res.data;
  },

  getById: async (id: string): Promise<Trip> => {
    const res = await axios.get<Trip>(`${BASE_URL}/${id}`);
    return res.data;
  },

  // Matches TripsController.Search exactly: fromTerminalId/toTerminalId/date are required,
  // minAvailableSeats is optional. The backend already excludes non-bookable statuses and
  // already-departed trips — no client-side re-filtering needed.
  search: async (params: TripSearchParams): Promise<TripSearchResult[]> => {
    const res = await axios.get<TripSearchResult[]>(`${BASE_URL}/search`, {
      params: {
        fromTerminalId: params.fromTerminalId,
        toTerminalId: params.toTerminalId,
        date: params.date,
        ...(params.minAvailableSeats !== undefined ? { minAvailableSeats: params.minAvailableSeats } : {}),
      },
    });
    return res.data;
  },

  create: async (dto: TripCreateDto): Promise<Trip> => {
    const res = await axios.post<Trip>(BASE_URL, dto);
    return res.data;
  },

  // NOTE: the backend deletes-and-recreates all TripSeats on every Update — if ANY seat on
  // this trip is already Held or Booked, the DB's Restrict FK will reject the delete and the
  // request comes back 409 Conflict with a message telling the caller to release/cancel first.
  update: async (id: string, dto: TripUpdateDto): Promise<Trip> => {
    const res = await axios.put<Trip>(`${BASE_URL}/${id}`, dto);
    return res.data;
  },

  // Returns void on hard delete (204), or { message, softDeleted: true } (200) when the trip
  // has real Bookings against it and was Cancelled + soft-deleted instead — check res.data on
  // the 200 case if you want to tell the user which happened.
  remove: async (id: string): Promise<{ message: string; softDeleted: true } | void> => {
    const res = await axios.delete(`${BASE_URL}/${id}`);
    return res.status === 200 ? res.data : undefined;
  },

  uploadImage: async (id: string, file: File): Promise<{ message: string; imageUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post<{ message: string; imageUrl: string }>(
      `${BASE_URL}/${id}/images`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },
};

export default tripService;

// src/services/scheduleApi.ts
// Uses the shared axios client (src/lib/api.ts) so auth token, base URL, and
// error handling match the rest of the app.

import { api } from "@/lib/api";
import {
  ScheduleCreateDto,
  ScheduleUpdateDto,
  ScheduleResponseDto,
  BusOperatorOption,
  BusOption,
  BusRouteOption,
  OperatorRouteOption,
} from "@/types/schedule.types";

const BASE_URL = "/api/Schedules";

export const scheduleApi = {
  getAll: (): Promise<ScheduleResponseDto[]> =>
    api.get(BASE_URL).then((r) => r.data),

  getById: (id: string): Promise<ScheduleResponseDto> =>
    api.get(`${BASE_URL}/${id}`).then((r) => r.data),

  create: (dto: ScheduleCreateDto): Promise<ScheduleResponseDto> =>
    api.post(BASE_URL, dto).then((r) => r.data),

  update: (id: string, dto: ScheduleUpdateDto): Promise<ScheduleResponseDto> =>
    api.put(`${BASE_URL}/${id}`, dto).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    api.delete(`${BASE_URL}/${id}`).then(() => undefined),
};

// --- Picker data sources -----------------------------------------------

export const pickerApi = {
  getBusOperators: (): Promise<BusOperatorOption[]> =>
    api.get("/api/BusOperators").then((r) => r.data),

  getBuses: (busOperatorId?: string): Promise<BusOption[]> =>
    api
      .get("/api/Buses", { params: busOperatorId ? { busOperatorId } : {} })
      .then((r) => r.data),

  getBusRoutes: (): Promise<BusRouteOption[]> =>
    api.get("/api/BusRoutes").then((r) => r.data),

  getOperatorRoutes: (busOperatorId?: string): Promise<OperatorRouteOption[]> =>
    api
      .get("/api/OperatorRoutes", { params: busOperatorId ? { busOperatorId } : {} })
      .then((r) => r.data),
};
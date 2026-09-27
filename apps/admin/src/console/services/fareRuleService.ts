import { getStoredBusOperators, BusOperator } from './busOperatorService';
import { getStoredBusRoutes, BusRouteResponseDto } from './busRouteService';

export type AppRole = 'Admin' | 'Staff' | 'Operator' | 'Guest';

export interface FareRule {
  id: string;
  busOperatorId: string | null; // null = platform-wide default price for the route
  busRouteId: string;
  busType?: string | null;
  seatType?: string | null;
  baseFare: number;
  currency: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
  isDeleted?: boolean;
}

export interface FareRuleCreateDto {
  busOperatorId?: string | null;
  busRouteId: string;
  busType?: string | null;
  seatType?: string | null;
  baseFare: number;
  currency: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string | null;
  isActive: boolean;
}

export interface FareRuleUpdateDto extends FareRuleCreateDto {
  rowVersion: string;
}

export interface FareRuleResponseDto {
  id: string;
  busOperatorId: string | null;
  busRouteId: string;
  busType?: string | null;
  seatType?: string | null;
  baseFare: number;
  currency: string;
  effectiveFromUtc: string;
  effectiveToUtc?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

export const FARE_RULE_STORAGE_KEY = 'ticket_portal_fare_rules';
export const FARE_RULE_UPDATED_EVENT = 'fare_rules_updated';

// ---- Mock auth context (mirrors the pattern used by operatorSettingService) ----
export function getCurrentUserRole(): AppRole {
  try {
    return (localStorage.getItem('auth_role') as AppRole) || 'Admin';
  } catch {
    return 'Admin';
  }
}

// Non-null only for an "Operator" role user scoped to their own BusOperator (mirrors
// User.GetBusOperatorIdAsync(db) on the API side). Admin/Staff are always unscoped (null).
export function getCurrentUserBusOperatorId(): string | null {
  try {
    const role = getCurrentUserRole();
    if (role !== 'Operator') return null;
    return localStorage.getItem('auth_operator_id');
  } catch {
    return null;
  }
}

function toResponseDto(item: FareRule): FareRuleResponseDto {
  return {
    id: item.id,
    busOperatorId: item.busOperatorId,
    busRouteId: item.busRouteId,
    busType: item.busType ?? null,
    seatType: item.seatType ?? null,
    baseFare: item.baseFare,
    currency: item.currency,
    effectiveFromUtc: item.effectiveFromUtc,
    effectiveToUtc: item.effectiveToUtc ?? null,
    isActive: item.isActive,
    createdAtUtc: item.createdAtUtc,
    updatedAtUtc: item.updatedAtUtc ?? null,
    rowVersion: item.rowVersion,
  };
}

const now = () => new Date().toISOString();
const newRowVersion = () => btoa(String(Date.now()) + Math.random().toString(36).slice(2, 6));
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `fr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

export const INITIAL_FARE_RULES: FareRule[] = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    busOperatorId: null,
    busRouteId: 'br-dhk-ctg-01',
    busType: 'Ac',
    seatType: 'Regular',
    baseFare: 1200,
    currency: 'BDT',
    effectiveFromUtc: '2026-01-01T00:00:00Z',
    effectiveToUtc: null,
    isActive: true,
    createdAtUtc: '2026-01-01T08:00:00Z',
    updatedAtUtc: '2026-01-01T08:00:00Z',
    rowVersion: 'AAAAAAAAC1A=',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000002',
    busOperatorId: 'b1983dc2-54bc-4180-87a3-8324f9104ad5',
    busRouteId: 'br-dhk-ctg-01',
    busType: 'Ac',
    seatType: 'Regular',
    baseFare: 1350,
    currency: 'BDT',
    effectiveFromUtc: '2026-01-05T00:00:00Z',
    effectiveToUtc: null,
    isActive: true,
    createdAtUtc: '2026-01-05T09:00:00Z',
    updatedAtUtc: '2026-01-05T09:00:00Z',
    rowVersion: 'AAAAAAAAC1B=',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000003',
    busOperatorId: 'eca5ffcd-7e5f-4e5a-8aba-2065eb5b6316',
    busRouteId: 'br-dhk-cxb-01',
    busType: 'NonAc',
    seatType: 'Window',
    baseFare: 850,
    currency: 'BDT',
    effectiveFromUtc: '2026-01-10T00:00:00Z',
    effectiveToUtc: null,
    isActive: true,
    createdAtUtc: '2026-01-10T09:00:00Z',
    updatedAtUtc: '2026-01-10T09:00:00Z',
    rowVersion: 'AAAAAAAAC1C=',
  },
];

export function getStoredFareRules(): FareRule[] {
  try {
    const raw = localStorage.getItem(FARE_RULE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => !item.isDeleted);
      }
    }
  } catch (err) {
    console.error('Error reading fare rules from storage:', err);
  }
  try {
    localStorage.setItem(FARE_RULE_STORAGE_KEY, JSON.stringify(INITIAL_FARE_RULES));
  } catch {
    // ignore
  }
  return [...INITIAL_FARE_RULES];
}

function persist(list: FareRule[]) {
  try {
    localStorage.setItem(FARE_RULE_STORAGE_KEY, JSON.stringify(list));
    // Realtime sync: every List/Details/Edit page listens for this so a Create/Edit/Delete
    // anywhere is reflected everywhere the resource is used, immediately.
    window.dispatchEvent(new CustomEvent(FARE_RULE_UPDATED_EVENT, { detail: list }));
  } catch (err) {
    console.error('Error persisting fare rules:', err);
  }
}

/**
 * Controller-aligned GetAll(): Admin/Staff/Operator only, empty array otherwise.
 * Scoped (Operator) callers never see the null (platform-default) rows or other operators' rows.
 */
export async function getFareRules(role?: AppRole, scopedOperatorId?: string | null): Promise<FareRuleResponseDto[]> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin' && currentRole !== 'Staff' && currentRole !== 'Operator') {
    return [];
  }
  const busOperatorId = scopedOperatorId !== undefined ? scopedOperatorId : getCurrentUserBusOperatorId();
  const list = getStoredFareRules();
  const scoped = busOperatorId != null ? list.filter((x) => x.busOperatorId === busOperatorId) : list;
  return scoped.map(toResponseDto);
}

/** Controller-aligned GetById(Guid id). */
export async function getFareRuleById(id: string, role?: AppRole, scopedOperatorId?: string | null): Promise<FareRuleResponseDto> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin' && currentRole !== 'Staff' && currentRole !== 'Operator') {
    throw new Error('403 Forbidden: You do not have permission to view fare rules.');
  }
  const list = getStoredFareRules();
  const item = list.find((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  if (!item) {
    throw new Error('404 NotFound: FareRule not found.');
  }
  const busOperatorId = scopedOperatorId !== undefined ? scopedOperatorId : getCurrentUserBusOperatorId();
  if (busOperatorId != null && item.busOperatorId !== busOperatorId) {
    throw new Error('403 Forbidden: This fare rule belongs to another operator.');
  }
  return toResponseDto(item);
}

/** Controller-aligned Create(FareRuleCreateDto dto). */
export async function createFareRule(
  dto: FareRuleCreateDto,
  role?: AppRole,
  scopedOperatorId?: string | null
): Promise<FareRuleResponseDto> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin' && currentRole !== 'Staff' && currentRole !== 'Operator') {
    throw new Error('403 Forbidden: You do not have permission to create fare rules.');
  }

  const busOperatorId = scopedOperatorId !== undefined ? scopedOperatorId : getCurrentUserBusOperatorId();

  let targetOperatorId: string | null;
  if (busOperatorId != null) {
    // Scoped: whatever the client sent is ignored — rule always belongs to the caller's own operator.
    targetOperatorId = busOperatorId;
  } else {
    if (dto.busOperatorId) {
      const operators = getStoredBusOperators();
      const exists = operators.some((o) => o.id === dto.busOperatorId);
      if (!exists) {
        throw new Error('400 BadRequest: BusOperatorId does not match a real BusOperator.');
      }
    }
    targetOperatorId = dto.busOperatorId ?? null;
  }

  const list = getStoredFareRules();
  const item: FareRule = {
    id: newId(),
    busOperatorId: targetOperatorId,
    busRouteId: dto.busRouteId,
    busType: dto.busType ?? null,
    seatType: dto.seatType ?? null,
    baseFare: dto.baseFare,
    currency: dto.currency,
    effectiveFromUtc: dto.effectiveFromUtc,
    effectiveToUtc: dto.effectiveToUtc ?? null,
    isActive: dto.isActive,
    createdAtUtc: now(),
    updatedAtUtc: now(),
    rowVersion: newRowVersion(),
  };

  list.unshift(item);
  persist(list);

  return toResponseDto(item);
}

/** Controller-aligned Update(Guid id, FareRuleUpdateDto dto) with RowVersion optimistic concurrency. */
export async function updateFareRule(
  id: string,
  dto: FareRuleUpdateDto,
  role?: AppRole,
  scopedOperatorId?: string | null
): Promise<FareRuleResponseDto> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin' && currentRole !== 'Staff' && currentRole !== 'Operator') {
    throw new Error('403 Forbidden: You do not have permission to update fare rules.');
  }

  const list = getStoredFareRules();
  const idx = list.findIndex((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  if (idx < 0) {
    throw new Error('404 NotFound: FareRule not found.');
  }
  const existing = list[idx];

  const busOperatorId = scopedOperatorId !== undefined ? scopedOperatorId : getCurrentUserBusOperatorId();
  if (busOperatorId != null && existing.busOperatorId !== busOperatorId) {
    throw new Error('403 Forbidden: This fare rule belongs to another operator.');
  }

  if (!dto.rowVersion) {
    throw new Error('400 BadRequest: RowVersion is required.');
  }
  if (dto.rowVersion !== existing.rowVersion) {
    throw new Error('409 Conflict: This FareRule was changed by another request. Please GET the latest data and try again.');
  }

  // Scoped staff can never move a rule to another operator or clear it to a platform-default.
  let nextOperatorId = existing.busOperatorId;
  if (busOperatorId == null) {
    if (dto.busOperatorId) {
      const operators = getStoredBusOperators();
      const exists = operators.some((o) => o.id === dto.busOperatorId);
      if (!exists) {
        throw new Error('400 BadRequest: BusOperatorId does not match a real BusOperator.');
      }
    }
    nextOperatorId = dto.busOperatorId ?? null;
  }

  const updated: FareRule = {
    ...existing,
    busOperatorId: nextOperatorId,
    busRouteId: dto.busRouteId,
    busType: dto.busType ?? null,
    seatType: dto.seatType ?? null,
    baseFare: dto.baseFare,
    currency: dto.currency,
    effectiveFromUtc: dto.effectiveFromUtc,
    effectiveToUtc: dto.effectiveToUtc ?? null,
    isActive: dto.isActive,
    updatedAtUtc: now(),
    rowVersion: newRowVersion(),
  };

  list[idx] = updated;
  persist(list);

  return toResponseDto(updated);
}

/** Controller-aligned Delete(Guid id) — soft delete, matches AuditableEntity.MarkDeleted(). */
export async function deleteFareRule(id: string, role?: AppRole, scopedOperatorId?: string | null): Promise<void> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin' && currentRole !== 'Staff' && currentRole !== 'Operator') {
    throw new Error('403 Forbidden: You do not have permission to delete fare rules.');
  }

  const list = getStoredFareRules();
  const idx = list.findIndex((x) => String(x.id).toLowerCase() === String(id).toLowerCase());
  if (idx < 0) {
    throw new Error('404 NotFound: FareRule not found.');
  }

  const busOperatorId = scopedOperatorId !== undefined ? scopedOperatorId : getCurrentUserBusOperatorId();
  if (busOperatorId != null && list[idx].busOperatorId !== busOperatorId) {
    throw new Error('403 Forbidden: This fare rule belongs to another operator.');
  }

  list[idx] = { ...list[idx], isDeleted: true, updatedAtUtc: now() };
  persist(list);
}

// ---- Helpers for dropdowns / display enrichment ----
export function getOperatorNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  getStoredBusOperators().forEach((op: BusOperator) => {
    if (op.id && op.name) map.set(op.id, op.name);
  });
  return map;
}

export function getRouteMap(): Map<string, BusRouteResponseDto> {
  const map = new Map<string, BusRouteResponseDto>();
  getStoredBusRoutes().forEach((r) => map.set(r.id, r));
  return map;
}

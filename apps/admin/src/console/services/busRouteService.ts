import { getStoredTerminals, getTerminalById, getAllTerminals, TerminalResponseDto } from './terminalService';
import { api } from '@/lib/api';

// Re-export terminal types and helpers so consumers can import everything from one place safely
export type { TerminalResponseDto };
export { getStoredTerminals, getTerminalById, getAllTerminals };

export interface BusRouteCreateDto {
  originTerminalId: string;
  destinationTerminalId: string;
  reverseRouteId?: string | null;
  routeCode: string;
  name: string;
  distanceKm: number;
  estimatedDurationMinutes: number;
  defaultBaseFare?: number | null;
  isActive: boolean;
}

export interface BusRouteUpdateDto extends BusRouteCreateDto {
  rowVersion: string;
}

export interface BusRouteResponseDto {
  id: string;
  originTerminalId: string;
  destinationTerminalId: string;
  reverseRouteId?: string | null;
  routeCode: string;
  name: string;
  distanceKm: number;
  estimatedDurationMinutes: number;
  defaultBaseFare?: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
  isDeleted?: boolean;
}

export interface BusRouteEnriched extends BusRouteResponseDto {
  originTerminal?: TerminalResponseDto;
  destinationTerminal?: TerminalResponseDto;
  reverseRouteCode?: string;
  reverseRouteName?: string;
}

const STORAGE_KEY_BUS_ROUTES = 'ticket_portal_bus_routes';
const SYNC_CHANNEL_NAME = 'ticket_portal_bus_routes_sync';

// Cross-tab broadcast channel for real-time synchronization
let syncBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncBroadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel initialization failed, falling back to window events:', err);
  }
}

/**
 * Dispatches real-time events across all components in the current tab
 * and across any other open browser tabs.
 */
export function notifyBusRoutesChanged(): void {
  if (typeof window === 'undefined') return;

  const routes = getStoredBusRoutes();
  const terminals = getStoredTerminals();
  const enriched = routes.map(r => enrichRoute(r, terminals, routes));

  // 1. Current tab event
  try {
    window.dispatchEvent(new CustomEvent('bus_routes_updated', { detail: enriched }));
  } catch (e) {
    console.error('Error dispatching bus_routes_updated event:', e);
  }

  // 2. Cross-tab BroadcastChannel
  try {
    if (syncBroadcastChannel) {
      syncBroadcastChannel.postMessage({
        type: 'BUS_ROUTES_CHANGED',
        timestamp: Date.now(),
        count: routes.length
      });
    }
  } catch (e) {
    console.warn('BroadcastChannel postMessage failed:', e);
  }
}

/**
 * Subscribes to real-time bus route updates.
 * Fires callback whenever routes are created, updated, deleted, or altered in any tab.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToBusRoutes(callback: (routes: BusRouteEnriched[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    getAllBusRoutes()
      .then(callback)
      .catch((err) => {
        console.warn('Error fetching latest routes for subscription:', err);
      });
  };

  // Listen to in-memory custom events
  window.addEventListener('bus_routes_updated', handleUpdate);

  // Listen to cross-tab storage changes
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_BUS_ROUTES) {
      handleUpdate();
    }
  };
  window.addEventListener('storage', handleStorage);

  // Listen to BroadcastChannel cross-tab notifications
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'BUS_ROUTES_CHANGED') {
      handleUpdate();
    }
  };

  if (syncBroadcastChannel) {
    syncBroadcastChannel.addEventListener('message', handleBcMessage);
  }

  return () => {
    window.removeEventListener('bus_routes_updated', handleUpdate);
    window.removeEventListener('storage', handleStorage);
    if (syncBroadcastChannel) {
      syncBroadcastChannel.removeEventListener('message', handleBcMessage);
    }
  };
}

export function getCurrentUserRole(): 'Admin' | 'User' | 'Guest' {
  if (typeof window === 'undefined') return 'Admin';
  const role = localStorage.getItem('auth_role');
  if (role === 'User' || role === 'Guest' || role === 'Admin') {
    return role;
  }
  return 'Admin';
}

// Was a hard-coded list of made-up operators/buses/routes (with GUIDs that do not exist in the
// database) that leaked into dropdowns and produced foreign-key errors. Only real, API-fetched
// records are cached now.
export const INITIAL_BUS_ROUTES: BusRouteResponseDto[] = [];

export function getStoredBusRoutes(): BusRouteResponseDto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUS_ROUTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BUS_ROUTES, JSON.stringify(INITIAL_BUS_ROUTES));
      return INITIAL_BUS_ROUTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.filter((r: BusRouteResponseDto) => !r.isDeleted)
      : INITIAL_BUS_ROUTES;
  } catch {
    return INITIAL_BUS_ROUTES;
  }
}

function enrichRoute(
  route: BusRouteResponseDto,
  terminals: TerminalResponseDto[],
  allRoutes: BusRouteResponseDto[]
): BusRouteEnriched {
  const origin = terminals.find(t => t.id.toLowerCase() === route.originTerminalId.toLowerCase());
  const dest = terminals.find(t => t.id.toLowerCase() === route.destinationTerminalId.toLowerCase());
  const reverse = route.reverseRouteId
    ? allRoutes.find(r => r.id.toLowerCase() === route.reverseRouteId?.toLowerCase())
    : undefined;

  return {
    ...route,
    originTerminal: origin,
    destinationTerminal: dest,
    reverseRouteCode: reverse ? reverse.routeCode : undefined,
    reverseRouteName: reverse ? reverse.name : undefined
  };
}

// Controller endpoint: [HttpGet] GetAll()
// Open to any logged-in user ([Authorize])
export async function getAllBusRoutes(role?: string): Promise<BusRouteEnriched[]> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole === 'Guest') {
    throw new Error('401 Unauthorized: Please log in to view platform bus routes.');
  }

  // Real data only: the original prototype answered from a localStorage list of made-up
  // routes, so trip/schedule forms offered route ids that do not exist in the database.
  const res = await api.get('api/BusRoutes');
  const routes: BusRouteResponseDto[] = Array.isArray(res.data) ? res.data : [];
  try {
    localStorage.setItem(STORAGE_KEY_BUS_ROUTES, JSON.stringify(routes));
    notifyBusRoutesChanged();
  } catch {
    // cache only - ignore quota/private-mode errors
  }

  let terminals = getStoredTerminals();
  try {
    terminals = await getAllTerminals();
  } catch {
    // fall back to whatever terminals were last fetched
  }
  return routes.map(r => enrichRoute(r, terminals, routes));
}

// Controller endpoint: [HttpGet("{id}")] GetById(Guid id)
// Open to any logged-in user
export async function getBusRouteById(id: string, role?: string): Promise<BusRouteEnriched> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole === 'Guest') {
    throw new Error('401 Unauthorized: Please log in to view route details.');
  }

  const routes = getStoredBusRoutes();
  const found = routes.find(r => r.id.toLowerCase() === id.toLowerCase());
  if (!found) {
    throw new Error('404 NotFound: BusRoute not found.');
  }

  const terminals = getStoredTerminals();
  return enrichRoute(found, terminals, routes);
}

// Controller endpoint: [HttpPost] Create(BusRouteCreateDto dto)
// Writes Admin-only: shared platform routing data
export async function createBusRouteRecord(
  dto: BusRouteCreateDto,
  role?: string
): Promise<BusRouteEnriched> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin') {
    throw new Error('403 Forbidden: Only Admin role can create canonical BusRoutes. This is shared platform routing data.');
  }

  if (!dto.originTerminalId || !dto.destinationTerminalId) {
    throw new Error('400 BadRequest: Both OriginTerminalId and DestinationTerminalId are required.');
  }

  if (dto.originTerminalId.toLowerCase() === dto.destinationTerminalId.toLowerCase()) {
    throw new Error('400 BadRequest: Origin and Destination terminals cannot be identical.');
  }

  if (!dto.routeCode.trim()) {
    throw new Error('400 BadRequest: RouteCode cannot be empty.');
  }

  if (!dto.name.trim()) {
    throw new Error('400 BadRequest: Name cannot be empty.');
  }

  if (dto.distanceKm < 0) {
    throw new Error('400 BadRequest: DistanceKm cannot be negative.');
  }

  if (dto.estimatedDurationMinutes < 0) {
    throw new Error('400 BadRequest: EstimatedDurationMinutes cannot be negative.');
  }

  if (dto.defaultBaseFare !== null && dto.defaultBaseFare !== undefined && dto.defaultBaseFare < 0) {
    throw new Error('400 BadRequest: DefaultBaseFare cannot be negative.');
  }

  const routes = getStoredBusRoutes();

  // Unique index on OriginTerminalId + DestinationTerminalId
  const duplicate = routes.find(
    r =>
      r.originTerminalId.toLowerCase() === dto.originTerminalId.toLowerCase() &&
      r.destinationTerminalId.toLowerCase() === dto.destinationTerminalId.toLowerCase()
  );

  if (duplicate) {
    throw new Error(
      `409 Conflict: A canonical BusRoute between this Origin and Destination already exists (${duplicate.routeCode} - "${duplicate.name}"). Only one canonical route can exist per terminal pair.`
    );
  }

  const codeDuplicate = routes.find(
    r => r.routeCode.toLowerCase() === dto.routeCode.trim().toLowerCase()
  );
  if (codeDuplicate) {
    throw new Error(`409 Conflict: RouteCode "${dto.routeCode.trim()}" is already in use by route "${codeDuplicate.name}".`);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID ? crypto.randomUUID() : `br-${Date.now()}`;
  const rowVersion = btoa(String(Date.now()));

  const newRoute: BusRouteResponseDto = {
    id,
    originTerminalId: dto.originTerminalId,
    destinationTerminalId: dto.destinationTerminalId,
    reverseRouteId: dto.reverseRouteId || null,
    routeCode: dto.routeCode.trim().toUpperCase(),
    name: dto.name.trim(),
    distanceKm: Number(dto.distanceKm),
    estimatedDurationMinutes: Number(dto.estimatedDurationMinutes),
    defaultBaseFare: dto.defaultBaseFare !== undefined && dto.defaultBaseFare !== null && dto.defaultBaseFare !== ('' as any)
      ? Number(dto.defaultBaseFare)
      : null,
    isActive: dto.isActive ?? true,
    createdAtUtc: now,
    updatedAtUtc: null,
    rowVersion
  };

  routes.push(newRoute);

  // If this route specifies a reverseRouteId, also automatically set that reverse route's reverseRouteId to this route if empty
  if (dto.reverseRouteId) {
    const revIdx = routes.findIndex(r => r.id.toLowerCase() === dto.reverseRouteId?.toLowerCase());
    if (revIdx >= 0 && !routes[revIdx].reverseRouteId) {
      routes[revIdx] = {
        ...routes[revIdx],
        reverseRouteId: id,
        updatedAtUtc: now,
        rowVersion: btoa(String(Date.now() + 1))
      };
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY_BUS_ROUTES, JSON.stringify(routes));
    notifyBusRoutesChanged();
  } catch (err) {
    console.error('Error saving bus route:', err);
  }

  const terminals = getStoredTerminals();
  return enrichRoute(newRoute, terminals, routes);
}

// Controller endpoint: [HttpPut("{id}")] Update(Guid id, BusRouteUpdateDto dto)
// Writes Admin-only with RowVersion optimistic concurrency
export async function updateBusRouteRecord(
  id: string,
  dto: BusRouteUpdateDto,
  role?: string
): Promise<BusRouteEnriched> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin') {
    throw new Error('403 Forbidden: Only Admin role can update BusRoutes.');
  }

  const routes = getStoredBusRoutes();
  const index = routes.findIndex(r => r.id.toLowerCase() === id.toLowerCase());
  if (index < 0) {
    throw new Error('404 NotFound: BusRoute not found.');
  }

  const existing = routes[index];

  if (!dto.rowVersion || dto.rowVersion.length === 0) {
    throw new Error('400 BadRequest: RowVersion is required.');
  }

  if (existing.rowVersion && existing.rowVersion !== dto.rowVersion) {
    throw new Error('409 Conflict: This BusRoute was changed by another request. Please GET the latest data and try again.');
  }

  if (dto.originTerminalId.toLowerCase() === dto.destinationTerminalId.toLowerCase()) {
    throw new Error('400 BadRequest: Origin and Destination terminals cannot be identical.');
  }

  // Check unique OriginTerminalId + DestinationTerminalId
  const pairDuplicate = routes.find(
    r =>
      r.id.toLowerCase() !== id.toLowerCase() &&
      r.originTerminalId.toLowerCase() === dto.originTerminalId.toLowerCase() &&
      r.destinationTerminalId.toLowerCase() === dto.destinationTerminalId.toLowerCase()
  );
  if (pairDuplicate) {
    throw new Error(
      `409 Conflict: Another canonical BusRoute already exists for this Origin-Destination pair (${pairDuplicate.routeCode}).`
    );
  }

  const codeDuplicate = routes.find(
    r => r.id.toLowerCase() !== id.toLowerCase() && r.routeCode.toLowerCase() === dto.routeCode.trim().toLowerCase()
  );
  if (codeDuplicate) {
    throw new Error(`409 Conflict: RouteCode "${dto.routeCode.trim()}" is already used by another route.`);
  }

  const now = new Date().toISOString();
  const nextRowVersion = btoa(String(Date.now()));

  const updated: BusRouteResponseDto = {
    ...existing,
    originTerminalId: dto.originTerminalId,
    destinationTerminalId: dto.destinationTerminalId,
    reverseRouteId: dto.reverseRouteId || null,
    routeCode: dto.routeCode.trim().toUpperCase(),
    name: dto.name.trim(),
    distanceKm: Number(dto.distanceKm),
    estimatedDurationMinutes: Number(dto.estimatedDurationMinutes),
    defaultBaseFare: dto.defaultBaseFare !== undefined && dto.defaultBaseFare !== null && dto.defaultBaseFare !== ('' as any)
      ? Number(dto.defaultBaseFare)
      : null,
    isActive: dto.isActive ?? true,
    updatedAtUtc: now,
    rowVersion: nextRowVersion
  };

  routes[index] = updated;

  try {
    localStorage.setItem(STORAGE_KEY_BUS_ROUTES, JSON.stringify(routes));
    notifyBusRoutesChanged();
  } catch (err) {
    console.error('Error updating bus route:', err);
  }

  const terminals = getStoredTerminals();
  return enrichRoute(updated, terminals, routes);
}

// Controller endpoint: [HttpDelete("{id}")] Delete(Guid id)
// Soft delete via AuditableEntity.MarkDeleted
export async function deleteBusRouteRecord(id: string, role?: string): Promise<void> {
  const currentRole = role || getCurrentUserRole();
  if (currentRole !== 'Admin') {
    throw new Error('403 Forbidden: Only Admin role can delete BusRoutes.');
  }

  const routes = getStoredBusRoutes();
  const index = routes.findIndex(r => r.id.toLowerCase() === id.toLowerCase());
  if (index < 0) {
    throw new Error('404 NotFound: BusRoute not found.');
  }

  // Soft delete
  routes[index] = {
    ...routes[index],
    isDeleted: true,
    updatedAtUtc: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY_BUS_ROUTES, JSON.stringify(routes));
    notifyBusRoutesChanged();
  } catch (err) {
    console.error('Error deleting bus route:', err);
  }
}

/**
 * Synchronously get active enriched bus routes.
 */
export function getActiveBusRoutes(): BusRouteEnriched[] {
  const routes = getStoredBusRoutes().filter(r => r.isActive && !r.isDeleted);
  const terminals = getStoredTerminals();
  return routes.map(r => enrichRoute(r, terminals, routes));
}

/**
 * Search enriched bus routes by code, name, city, or terminal.
 */
export function searchBusRoutes(query: string, onlyActive = true): BusRouteEnriched[] {
  const routes = getStoredBusRoutes();
  const terminals = getStoredTerminals();
  let enriched = routes.map(r => enrichRoute(r, terminals, routes));

  if (onlyActive) {
    enriched = enriched.filter(r => r.isActive && !r.isDeleted);
  }

  if (!query || !query.trim()) {
    return enriched;
  }

  const q = query.trim().toLowerCase();
  return enriched.filter(r => {
    return (
      r.routeCode.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.originTerminal?.city.toLowerCase().includes(q) ||
      r.originTerminal?.name.toLowerCase().includes(q) ||
      r.destinationTerminal?.city.toLowerCase().includes(q) ||
      r.destinationTerminal?.name.toLowerCase().includes(q)
    );
  });
}

// Helpers
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 mins';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

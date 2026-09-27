export interface FleetBus {
  id: string;
  modelName: string;
  registrationNumber: string;
  operatorName: string;
  coachNumber?: string;
  brand?: string | null;
  model?: string | null;
  busOperatorId?: string;
  busCategoryId?: string | null;
  busType?: string;
  totalSeats?: number;
  hasWifi?: boolean;
  hasToilet?: boolean;
  isActive?: boolean;
  primaryImageUrl?: string | null;
  seatingCapacity?: number;
  busCategory?: string;
  routeSummary?: string;
  createdAt?: string;
}

export interface BusResponseDto {
  id: string;
  busOperatorId?: string;
  busCategoryId?: string | null;
  registrationNumber: string;
  coachNumber?: string;
  brand?: string | null;
  model?: string | null;
  registrationDate?: string | null;
  busType?: string;
  totalSeats?: number;
  hasWifi?: boolean;
  hasToilet?: boolean;
  isActive?: boolean;
  primaryImageUrl?: string | null;
  seats?: any[];
  rowVersion?: string;
  // mapped helpers
  modelName?: string;
  operatorName?: string;
}

export const FLEET_BUSES_STORAGE_KEY = 'ticket_portal_fleet_buses';

// Was a hard-coded list of made-up operators/buses/routes (with GUIDs that do not exist in the
// database) that leaked into dropdowns and produced foreign-key errors. Only real, API-fetched
// records are cached now.
export const INITIAL_FLEET_BUSES: FleetBus[] = [];

export function normalizeBusData(bus: any, operatorsMap: Record<string, string> = {}, categoriesMap: Record<string, string> = {}): FleetBus {
  const modelName = bus.modelName || 
    (bus.brand && bus.model ? `${bus.brand} ${bus.model}` : bus.brand || bus.model || bus.coachNumber || 'Fleet Coach');
  
  const operatorName = bus.operatorName || 
    (bus.busOperatorId && operatorsMap[bus.busOperatorId] ? operatorsMap[bus.busOperatorId] : 'Operator');

  const busCategory = bus.busCategory || 
    (bus.busCategoryId && categoriesMap[bus.busCategoryId] ? categoriesMap[bus.busCategoryId] : bus.busType || 'AC Coach');

  return {
    id: bus.id,
    modelName: modelName.trim(),
    registrationNumber: (bus.registrationNumber || bus.coachNumber || 'UNREGISTERED').toUpperCase(),
    operatorName,
    coachNumber: bus.coachNumber || bus.registrationNumber,
    brand: bus.brand,
    model: bus.model,
    busOperatorId: bus.busOperatorId,
    busCategoryId: bus.busCategoryId,
    busType: bus.busType,
    totalSeats: bus.totalSeats || bus.seatingCapacity || 40,
    seatingCapacity: bus.totalSeats || bus.seatingCapacity || 40,
    hasWifi: Boolean(bus.hasWifi),
    hasToilet: Boolean(bus.hasToilet),
    isActive: bus.isActive !== undefined ? Boolean(bus.isActive) : true,
    primaryImageUrl: bus.primaryImageUrl,
    routeSummary: bus.routeSummary || 'Intercity Route',
    createdAt: bus.createdAt || bus.registrationDate || new Date().toISOString().slice(0, 10)
  };
}

export function syncBusesFromApiOrList(apiBuses: any[], operatorsMap: Record<string, string> = {}, categoriesMap: Record<string, string> = {}): FleetBus[] {
  if (!Array.isArray(apiBuses)) {
    return getStoredFleetBuses();
  }

  const normalized = apiBuses.map(b => normalizeBusData(b, operatorsMap, categoriesMap));
  
  // Also preserve any manually added local buses that might not yet exist in API
  const currentLocal = getStoredFleetBuses();
  const apiIds = new Set(normalized.map(b => String(b.id).toLowerCase()));
  const localOnly = currentLocal.filter(b => !apiIds.has(String(b.id).toLowerCase()));

  const combined = [...normalized, ...localOnly];

  try {
    localStorage.setItem(FLEET_BUSES_STORAGE_KEY, JSON.stringify(combined));
    window.dispatchEvent(new CustomEvent('fleet_buses_updated', { detail: combined }));
  } catch (err) {
    console.error('Error syncing buses:', err);
  }
  return combined;
}

export function getStoredFleetBuses(): FleetBus[] {
  try {
    const raw = localStorage.getItem(FLEET_BUSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(b => normalizeBusData(b));
      }
    }
  } catch (err) {
    console.error('Error reading fleet buses from localStorage:', err);
  }

  // If not present in localStorage, initialize with default seed buses
  try {
    localStorage.setItem(FLEET_BUSES_STORAGE_KEY, JSON.stringify(INITIAL_FLEET_BUSES));
  } catch (e) {
    // ignore
  }
  return INITIAL_FLEET_BUSES.map(b => normalizeBusData(b));
}

export function saveFleetBus(bus: Omit<FleetBus, 'id'> & { id?: string }): FleetBus {
  const list = getStoredFleetBuses();
  const id = bus.id || (crypto.randomUUID ? crypto.randomUUID() : `bus-${Date.now()}`);
  const newBus: FleetBus = {
    ...bus,
    id,
    createdAt: bus.createdAt || new Date().toISOString().slice(0, 10)
  };

  const existingIdx = list.findIndex(b => String(b.id).toLowerCase() === String(id).toLowerCase());
  if (existingIdx >= 0) {
    list[existingIdx] = newBus;
  } else {
    list.unshift(newBus);
  }

  try {
    localStorage.setItem(FLEET_BUSES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('fleet_buses_updated', { detail: list }));
  } catch (err) {
    console.error('Error saving fleet bus to localStorage:', err);
  }

  return newBus;
}

export function deleteFleetBus(id: string): void {
  const list = getStoredFleetBuses();
  const filtered = list.filter(b => String(b.id).toLowerCase() !== String(id).toLowerCase());
  try {
    localStorage.setItem(FLEET_BUSES_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('fleet_buses_updated', { detail: filtered }));
  } catch (err) {
    console.error('Error deleting fleet bus from localStorage:', err);
  }
}

export function getFleetBusById(id: string): FleetBus | undefined {
  const list = getStoredFleetBuses();
  return list.find(b => b.id.toLowerCase() === id.toLowerCase());
}

export interface OperatorRoute {
  id?: string | null;
  busOperatorId?: string;
  busRouteId: string;
  operatorRouteCode?: string;
  displayName?: string;
  inventoryModeOverride?: string;
  isActive?: boolean;
  rowVersion?: string | null;
}

export interface BusOperator {
  id: string;
  name: string;
  legalName?: string | null;
  registrationNumber?: string | null;
  contactPhone?: string;
  email?: string | null;
  contactEmail?: string;
  addressLine?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  foundedYear?: number;
  registeredOnUtc?: string;
  inventoryMode?: string;
  isActive: boolean;
  logoUrl?: string | null;
  operatorRoutes?: OperatorRoute[];
  rowVersion?: string | null;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const BUS_OPERATORS_STORAGE_KEY = 'ticket_portal_bus_operators';

// Was a hard-coded list of made-up operators/buses/routes (with GUIDs that do not exist in the
// database) that leaked into dropdowns and produced foreign-key errors. Only real, API-fetched
// records are cached now.
export const INITIAL_BUS_OPERATORS: BusOperator[] = [];

export function getStoredBusOperators(): BusOperator[] {
  let list: BusOperator[] = [];

  try {
    const raw = localStorage.getItem(BUS_OPERATORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.error('Error reading bus operators from storage:', err);
  }

  if (list.length === 0) {
    list = [...INITIAL_BUS_OPERATORS];
    try {
      localStorage.setItem(BUS_OPERATORS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }

  // (Removed: a block that scanned the local fleet cache and INVENTED operators from bus
  // "operatorName" strings, producing fake operators with non-existent ids.)

  return list;
}

export function saveBusOperator(operator: Partial<BusOperator> & { name: string }): BusOperator {
  const list = getStoredBusOperators();
  const id = operator.id || (crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`);
  const now = new Date().toISOString();

  const newOp: BusOperator = {
    ...operator,
    id,
    name: operator.name.trim(),
    legalName: operator.legalName?.trim() || operator.name.trim(),
    registrationNumber: operator.registrationNumber || null,
    contactPhone: operator.contactPhone || '',
    email: operator.email || operator.contactEmail || null,
    contactEmail: operator.contactEmail || operator.email || undefined,
    addressLine: operator.addressLine || operator.address || '',
    address: operator.address || operator.addressLine || '',
    city: operator.city || 'Dhaka',
    district: operator.district || 'Dhaka',
    country: operator.country || 'Bangladesh',
    foundedYear: operator.foundedYear || new Date().getFullYear(),
    registeredOnUtc: operator.registeredOnUtc || now,
    inventoryMode: operator.inventoryMode || 'PlatformManaged',
    isActive: operator.isActive !== undefined ? operator.isActive : true,
    logoUrl: operator.logoUrl || null,
    operatorRoutes: operator.operatorRoutes || [],
    rowVersion: operator.rowVersion || btoa(String(Date.now())),
    code: operator.code || operator.name.replace(/[^a-zA-Z]/g, '').slice(0, 8).toUpperCase(),
    createdAt: operator.createdAt || now,
    updatedAt: now
  };

  const idx = list.findIndex(item => String(item.id).toLowerCase() === String(id).toLowerCase());
  if (idx >= 0) {
    list[idx] = newOp;
  } else {
    list.unshift(newOp);
  }

  try {
    localStorage.setItem(BUS_OPERATORS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('bus_operators_updated', { detail: list }));
  } catch (err) {
    console.error('Error saving bus operator:', err);
  }

  return newOp;
}

export function deleteBusOperatorById(id: string): void {
  const list = getStoredBusOperators();
  const filtered = list.filter(op => String(op.id).toLowerCase() !== String(id).toLowerCase());
  try {
    localStorage.setItem(BUS_OPERATORS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('bus_operators_updated', { detail: filtered }));
  } catch (err) {
    console.error('Error deleting bus operator:', err);
  }
}

export function getBusOperatorById(id: string): BusOperator | undefined {
  const list = getStoredBusOperators();
  return list.find(op => String(op.id).toLowerCase() === String(id).toLowerCase());
}

export function getBusOperatorNameById(id: string): string {
  const op = getBusOperatorById(id);
  return op ? op.name : 'Unknown Operator';
}

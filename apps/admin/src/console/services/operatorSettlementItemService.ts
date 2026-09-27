import { api } from '@/lib/api';

// Real backend contract (OperatorSettlementItemsController) — READ ONLY.
// Every row is written exclusively by SettlementGenerationService when a settlement is
// generated; there is deliberately no POST/PUT/DELETE on this controller (see its class
// comment) so a settlement line item can never be fabricated or hand-edited outside a real
// ledger event. The frontend must not pretend otherwise.
//   GET api/OperatorSettlementItems?operatorSettlementId={guid}   [Admin/Staff/Operator, scoped]
//   GET api/OperatorSettlementItems/{id}                          [Admin/Staff/Operator, scoped]

export type StatementItemType =
  | 'OnlineTicketSale'
  | 'PlatformCommission'
  | 'GatewayCharge'
  | 'Refund'
  | 'CancellationFee'
  | 'CounterSaleCommission'
  | 'ManualAdjustment'
  | 'Tax'
  | 'Payout';

export type SaleChannel = 'Online' | 'Counter' | 'Agent' | 'Admin' | 'ExternalApi';

export interface OperatorSettlementItemResponseDto {
  id: string;
  operatorSettlementId: string;
  bookingId?: string | null;
  ticketId?: string | null;
  platformLedgerId?: string | null;
  itemType: StatementItemType;
  saleChannel: SaleChannel;
  ticketFare: number;
  platformCharge: number;
  gatewayCharge: number;
  refundAmount: number;
  netAmount: number;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// Broadcast for consistency with the rest of the app's realtime pattern (List/Details listen
// for this). Nothing in this app writes OperatorSettlementItems today — the real write path is
// the backend's SettlementGenerationService — so this only ever fires after a GET repopulates
// the shared cache. It exists so that, the moment a settlement-generation feature IS added,
// every open List/Details page picks the new rows up immediately with zero extra wiring.
export const OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT = 'operator_settlement_items_updated';
const CACHE_KEY = 'ticket_portal_operator_settlement_items_cache';

function writeCache(list: OperatorSettlementItemResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing operator settlement items cache:', err);
  }
  window.dispatchEvent(new CustomEvent(OPERATOR_SETTLEMENT_ITEM_UPDATED_EVENT, { detail: list }));
}

/** GET api/OperatorSettlementItems — optionally scoped to one settlement. Real backend call. */
export async function getOperatorSettlementItems(operatorSettlementId?: string): Promise<OperatorSettlementItemResponseDto[]> {
  const res = await api.get('api/OperatorSettlementItems', {
    params: operatorSettlementId ? { operatorSettlementId } : undefined,
  });
  const list: OperatorSettlementItemResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/OperatorSettlementItems/{id} — real backend call. */
export async function getOperatorSettlementItemById(id: string): Promise<OperatorSettlementItemResponseDto | undefined> {
  try {
    const res = await api.get(`api/OperatorSettlementItems/${id}`);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

// No createOperatorSettlementItem / updateOperatorSettlementItem / deleteOperatorSettlementItem
// export on purpose — the real API has no such endpoints. See class comment above.

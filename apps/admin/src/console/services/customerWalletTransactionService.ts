import { api } from '@/lib/api';

// Real backend contract (CustomerWalletTransactionsController) — READ ONLY.
// This is the paper trail behind CustomerProfile.WalletBalance. CustomerWalletService's
// CreditAsync/DebitAsync is the only writer, and it always writes the balance change and this
// row together — there is deliberately no POST/PUT/DELETE (see the controller's class comment),
// so a wallet transaction can never be fabricated or hand-edited outside a real balance change.
//   GET api/CustomerWalletTransactions        [Authorize] -> own transactions only, unless Admin/Staff/Operator
//   GET api/CustomerWalletTransactions/{id}   [Authorize] -> 403 if it's not yours and you're not Admin/Staff/Operator

export type CustomerWalletTransactionType = 'TopUp' | 'BookingPayment' | 'RefundCredit' | 'AdminAdjustment';

export interface CustomerWalletTransactionResponseDto {
  id: string;
  customerProfileId: string;
  bookingId?: string | null;
  refundId?: string | null;
  transactionType: CustomerWalletTransactionType;
  amount: number;
  balanceAfter: number;
  currency: string;
  description?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  rowVersion: string;
}

// Broadcast for consistency with the rest of the app's realtime pattern (List/Details listen
// for this). Nothing in this frontend writes wallet transactions — the real write path is the
// backend's CustomerWalletService — so this only fires after a GET repopulates the shared
// cache. It exists so that the moment top-up/refund features ARE wired in, every open
// List/Details page picks the new rows up immediately with zero extra work.
export const CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT = 'customer_wallet_transactions_updated';
const CACHE_KEY = 'ticket_portal_customer_wallet_transactions_cache';

function writeCache(list: CustomerWalletTransactionResponseDto[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error writing customer wallet transactions cache:', err);
  }
  window.dispatchEvent(new CustomEvent(CUSTOMER_WALLET_TRANSACTION_UPDATED_EVENT, { detail: list }));
}

/** GET api/CustomerWalletTransactions — real backend call. Own transactions only, unless staff. */
export async function getCustomerWalletTransactions(): Promise<CustomerWalletTransactionResponseDto[]> {
  const res = await api.get('api/CustomerWalletTransactions');
  const list: CustomerWalletTransactionResponseDto[] = res.data || [];
  writeCache(list);
  return list;
}

/** GET api/CustomerWalletTransactions/{id} — real backend call. */
export async function getCustomerWalletTransactionById(id: string): Promise<CustomerWalletTransactionResponseDto | undefined> {
  try {
    const res = await api.get(`api/CustomerWalletTransactions/${id}`);
    return res.data;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 404) return undefined;
    throw err;
  }
}

// No create/update/delete export on purpose — the real API has no such endpoints. Use
// CustomerWalletService.CreditAsync/DebitAsync on the backend to actually move wallet money.

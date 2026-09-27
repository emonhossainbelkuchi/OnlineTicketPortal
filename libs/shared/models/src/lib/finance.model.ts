import {
  CommissionType,
  InvoiceStatus,
  PaymentGateway,
  PaymentMethod,
  PaymentProviderKind,
  PayoutStatus,
  SaleChannel,
  SettlementDirection,
  SettlementStatus,
  StatementItemType,
} from './enums';

// ---------------------------------------------------------------------------
// Commission Rules — DTO/FinanceDtos.cs. RBAC Amendment v3 / Chunk 7 task 1+2: reads
// need Finance.ReadPlatform (Platform Finance or Admin), writes still need
// Finance.Configure (Admin only — see CommissionRulesController). GET/POST
// /api/CommissionRules, PUT/DELETE /api/CommissionRules/{id}.
// ---------------------------------------------------------------------------

export interface CommissionRuleCreateRequest {
  busOperatorId: string;
  operatorContractId?: string | null;
  busRouteId?: string | null;
  saleChannel: SaleChannel;
  commissionType: CommissionType;
  // Non-negative always; additionally capped at 100 server-side when
  // commissionType is 'Percentage' (CommissionRulesController.IsCommissionValueValid).
  commissionValue: number;
  effectiveFrom: string; // DateOnly, "yyyy-MM-dd".
  effectiveTo?: string | null;
  isActive: boolean;
}

export interface CommissionRuleUpdateRequest extends CommissionRuleCreateRequest {
  rowVersion: string;
}

export interface CommissionRule {
  id: string;
  busOperatorId: string;
  operatorContractId: string | null;
  busRouteId: string | null;
  saleChannel: SaleChannel;
  commissionType: CommissionType;
  commissionValue: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Operator Invoices & Payment Receipts — DTO/FinanceDtos.cs.
// OperatorInvoicesController: GET/POST /api/OperatorInvoices,
// POST /api/OperatorInvoices/{id}/issue, POST /api/OperatorInvoices/{id}/cancel.
// No PUT/DELETE — status only ever moves via Issue/Cancel or a recorded receipt.
// ---------------------------------------------------------------------------

export interface OperatorInvoiceCreateRequest {
  busOperatorId: string;
  operatorStatementId?: string | null;
  invoiceDate: string; // DateOnly.
  dueDate?: string | null;
  direction: SettlementDirection;
  amount: number;
  currency: string; // 3-letter code, e.g. "BDT".
}

// Used for both /cancel (reason required) bodies.
export interface OperatorInvoiceActionRequest {
  reason: string;
}

export interface OperatorInvoice {
  id: string;
  busOperatorId: string;
  operatorStatementId: string | null;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  direction: SettlementDirection;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// OperatorPaymentReceiptsController: GET/POST /api/OperatorPaymentReceipts.
// Create is platform-staff/Admin only — see the class comment on that
// controller for why letting an operator self-confirm their own receipt is a
// real hole, not just an access nicety.
export interface OperatorPaymentReceiptCreateRequest {
  operatorInvoiceId: string;
  amount: number;
  currency: string;
  referenceNo?: string | null;
  notes?: string | null;
}

export interface OperatorPaymentReceipt {
  id: string;
  operatorInvoiceId: string;
  receivedAtUtc: string;
  amount: number;
  currency: string;
  referenceNo: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Operator Payouts — DTO/FinanceDtos.cs. OperatorPayoutsController:
// GET/POST /api/OperatorPayouts, POST /{id}/process|complete|fail|cancel.
// Process/Complete/Fail/Cancel are platform-staff/Admin only (see
// OperatorPayoutsController.CheckAccessAsync) — the operator being paid never
// confirms their own payout.
// ---------------------------------------------------------------------------

export interface OperatorPayoutCreateRequest {
  busOperatorId: string;
  operatorSettlementId?: string | null;
  amount: number;
  currency: string;
  notes?: string | null;
}

export interface OperatorPayoutCompleteRequest {
  bankTransactionReference: string;
}

export interface OperatorPayoutActionRequest {
  reason: string;
}

export interface OperatorPayout {
  id: string;
  busOperatorId: string;
  operatorSettlementId: string | null;
  payoutNo: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paidAtUtc: string | null;
  bankTransactionReference: string | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Settlements — DTO/FinanceDtos.cs. OperatorSettlementsController:
// GET /api/OperatorSettlements, POST /generate, POST /{id}/approve.
// No generic POST/PUT/DELETE — every field is computed by
// SettlementGenerationService from real PlatformLedger rows. Approve is
// platform-staff/Admin only regardless of which operator it's for.
// ---------------------------------------------------------------------------

export interface SettlementGenerateRequest {
  busOperatorId: string;
  fromDate: string; // DateOnly.
  toDate: string;
  remarks?: string | null;
}

export interface SettlementApproveRequest {
  remarks?: string | null;
}

export interface OperatorSettlement {
  id: string;
  busOperatorId: string;
  operatorStatementId: string | null;
  operatorInvoiceId: string | null;
  settlementNo: string;
  fromDate: string;
  toDate: string;
  direction: SettlementDirection;
  status: SettlementStatus;
  onlineGrossAmount: number;
  offlineGrossAmount: number;
  platformCharge: number;
  gatewayCharge: number;
  refundAmount: number;
  netAmount: number;
  paidAtUtc: string | null;
  remarks: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// GetById returns this richer shape (OperatorSettlementDetailResponseDto).
export interface OperatorSettlementDetail extends OperatorSettlement {
  items: OperatorSettlementItem[];
}

// Read-only — every row is written by SettlementGenerationService alongside
// its parent settlement.
export interface OperatorSettlementItem {
  id: string;
  operatorSettlementId: string;
  bookingId: string | null;
  ticketId: string | null;
  platformLedgerId: string | null;
  itemType: StatementItemType;
  saleChannel: SaleChannel;
  ticketFare: number;
  platformCharge: number;
  gatewayCharge: number;
  refundAmount: number;
  netAmount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Statements — DTO/FinanceDtos.cs. OperatorStatementsController is read-only
// (GET /api/OperatorStatements, GET /{id}) — a statement is generated
// alongside its settlement by SettlementGenerationService, never by hand.
// ---------------------------------------------------------------------------

export interface OperatorStatement {
  id: string;
  busOperatorId: string;
  statementNo: string;
  fromDate: string;
  toDate: string;
  platformPayableToOperator: number;
  operatorPayableToPlatform: number;
  netAmount: number;
  netDirection: SettlementDirection;
  status: SettlementStatus;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface OperatorStatementDetail extends OperatorStatement {
  items: OperatorStatementItem[];
}

export interface OperatorStatementItem {
  id: string;
  operatorStatementId: string;
  bookingId: string | null;
  ticketId: string | null;
  paymentId: string | null;
  refundId: string | null;
  platformLedgerId: string | null;
  itemType: StatementItemType;
  saleChannel: SaleChannel;
  // Debit = operator owes platform. Credit = platform owes operator.
  debitAmount: number;
  creditAmount: number;
  currency: string;
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Operator Wallets & Platform Ledger — read-only, DTO/FinanceDtos.cs.
// OperatorWalletsController: GET /api/OperatorWallets, GET /{id},
// GET /by-operator/{busOperatorId}. PlatformLedgersController: GET
// /api/PlatformLedgers[?busOperatorId], GET /{id}.
// ---------------------------------------------------------------------------

// OperatorWallet.WithdrawnAmount/TotalPlatformCommission/TotalGatewayCharge/
// OperatorReceivableFromPlatform/PlatformReceivableFromOperator are LIFETIME
// accumulators, not live balances (see the model's own field comments on the
// backend) — PendingSettlementBalance/AvailablePayoutBalance are the
// "right now" figures.
export interface OperatorWallet {
  id: string;
  busOperatorId: string;
  totalOnlineSalesAmount: number;
  totalCounterSalesAmount: number;
  pendingSettlementBalance: number;
  availablePayoutBalance: number;
  withdrawnAmount: number;
  totalPlatformCommission: number;
  totalGatewayCharge: number;
  operatorReceivableFromPlatform: number;
  platformReceivableFromOperator: number;
  lastStatementDateUtc: string | null;
  lastSettlementDateUtc: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// The append-only master money diary. Every entry is written from the
// OPERATOR's point of view: Credit = platform now owes them more, Debit =
// they now owe the platform more.
export interface PlatformLedger {
  id: string;
  bookingId: string | null;
  paymentId: string | null;
  refundId: string | null;
  busOperatorId: string | null;
  operatorSettlementId: string | null;
  ledgerNo: string;
  itemType: StatementItemType;
  saleChannel: SaleChannel | null;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  referenceNo: string | null;
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// Customer Wallet Transactions (read-only, DTO/PeopleDtos.cs ->
// CustomerWalletTransactionResponseDto) already live in customer.model.ts —
// CustomerWalletTransactionsController just adds a Staff/Admin/Operator-wide
// GET on top of the same shape Piece 3 defined; no separate type needed here.

// ---------------------------------------------------------------------------
// System Finance Config — Admin-only end to end (Currencies, TaxRules,
// PaymentProviders, PaymentMethodConfigurations controllers all gate every
// action on User.IsInRole("Admin")). DTO/PaymentsExtraDtos.cs.
// ---------------------------------------------------------------------------

export interface CurrencyCreateRequest {
  code: string; // exactly 3 letters, e.g. "BDT".
  symbol: string;
  exchangeRateToBase: number;
  isBaseCurrency: boolean;
  isActive: boolean;
}

export interface CurrencyUpdateRequest extends CurrencyCreateRequest {
  rowVersion: string;
}

export interface Currency {
  id: string;
  code: string;
  symbol: string;
  exchangeRateToBase: number;
  isBaseCurrency: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface TaxRuleCreateRequest {
  name: string;
  percentage: number; // 0-100.
  isActive: boolean;
}

export interface TaxRuleUpdateRequest extends TaxRuleCreateRequest {
  rowVersion: string;
}

export interface TaxRule {
  id: string;
  name: string;
  percentage: number;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface PaymentProviderCreateRequest {
  name: string;
  code: string;
  providerKind: PaymentProviderKind;
  gateway: PaymentGateway;
  checkoutBaseUrl?: string | null;
  webhookUrl?: string | null;
  supportsRefund: boolean;
  isActive: boolean;
}

export interface PaymentProviderUpdateRequest extends PaymentProviderCreateRequest {
  rowVersion: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  code: string;
  providerKind: PaymentProviderKind;
  gateway: PaymentGateway;
  checkoutBaseUrl: string | null;
  webhookUrl: string | null;
  supportsRefund: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface PaymentMethodConfigurationCreateRequest {
  paymentProviderId: string;
  method: PaymentMethod;
  displayName: string;
  fixedFee?: number | null;
  percentageFee?: number | null; // 0-100.
  isActive: boolean;
}

export interface PaymentMethodConfigurationUpdateRequest extends PaymentMethodConfigurationCreateRequest {
  rowVersion: string;
}

export interface PaymentMethodConfiguration {
  id: string;
  paymentProviderId: string;
  method: PaymentMethod;
  displayName: string;
  fixedFee: number | null;
  percentageFee: number | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Finance reconciliation — DTO/FinanceReconciliationDtos.cs,
// Controllers/FinanceReconciliationController.cs. RBAC Amendment v3 / Chunk 7 task 4
// ("Missing-rule visibility"): the "confirmed bookings with no ledger rows" list and its
// safe re-post action. Both endpoints need Finance.Reconcile (Platform Finance or Admin
// only). GET /api/FinanceReconciliation/ledger-gaps, POST
// /api/FinanceReconciliation/ledger-gaps/{bookingId}/repost.
// ---------------------------------------------------------------------------

export interface LedgerGap {
  bookingId: string;
  pnr: string;
  busOperatorId: string;
  saleChannel: SaleChannel;
  grandTotal: number;
  currency: string;
  confirmedAtUtc: string;
  reason: string;
}

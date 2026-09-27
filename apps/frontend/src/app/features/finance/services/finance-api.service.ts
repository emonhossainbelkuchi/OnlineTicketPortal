import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  BusOperator,
  CommissionRule,
  CommissionRuleCreateRequest,
  CommissionRuleUpdateRequest,
  Currency,
  CurrencyCreateRequest,
  CurrencyUpdateRequest,
  CustomerWalletTransaction,
  OperatorInvoice,
  OperatorInvoiceActionRequest,
  OperatorInvoiceCreateRequest,
  OperatorPaymentReceipt,
  OperatorPaymentReceiptCreateRequest,
  OperatorPayout,
  OperatorPayoutActionRequest,
  OperatorPayoutCompleteRequest,
  OperatorPayoutCreateRequest,
  OperatorSettlement,
  OperatorSettlementDetail,
  OperatorStatement,
  OperatorStatementDetail,
  LedgerGap,
  OperatorWallet,
  PaymentMethodConfiguration,
  PaymentMethodConfigurationCreateRequest,
  PaymentMethodConfigurationUpdateRequest,
  PaymentProvider,
  PaymentProviderCreateRequest,
  PaymentProviderUpdateRequest,
  PlatformLedger,
  SettlementApproveRequest,
  SettlementGenerateRequest,
  TaxRule,
  TaxRuleCreateRequest,
  TaxRuleUpdateRequest,
} from '@ticketportal-mono/models';

/**
 * Every backend call Piece 6's screens need, in one place — see the
 * Frontend Guideline's "Piece 6" backend-surface list for the controllers
 * this wraps. Screens inject this instead of ApiService directly, same
 * pattern as AuthService for the auth domain.
 *
 * A few endpoints (CommissionRules/TaxRules/PaymentProviders/
 * PaymentMethodConfigurations reads, Currencies) need Finance.ReadPlatform
 * server-side (Platform Finance or Admin — RBAC Amendment v3 / Chunk 7 task 1);
 * writes on those same endpoints need Finance.Configure (Admin only). A caller
 * without the right permission still gets a clean 403, normalized and toasted
 * by ErrorInterceptor, so components don't need their own special-casing for
 * that — see finance.routes.ts for which screens are additionally gated at
 * the route level.
 */
@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly api = inject(ApiService);

  // ---- Operators (for the "which operator" picker every screen needs) ----

  listOperators(): Observable<BusOperator[]> {
    return this.api.get<BusOperator[]>('BusOperators');
  }

  // ---- Commission Rules (Admin-only) ----

  listCommissionRules(): Observable<CommissionRule[]> {
    return this.api.get<CommissionRule[]>('CommissionRules');
  }

  createCommissionRule(request: CommissionRuleCreateRequest): Observable<CommissionRule> {
    return this.api.post<CommissionRule>('CommissionRules', request);
  }

  updateCommissionRule(id: string, request: CommissionRuleUpdateRequest): Observable<CommissionRule> {
    return this.api.put<CommissionRule>(`CommissionRules/${id}`, request);
  }

  deleteCommissionRule(id: string): Observable<void> {
    return this.api.delete<void>(`CommissionRules/${id}`);
  }

  // ---- Operator Wallets & Platform Ledger (read-only) ----

  listWallets(): Observable<OperatorWallet[]> {
    return this.api.get<OperatorWallet[]>('OperatorWallets');
  }

  getWalletByOperator(busOperatorId: string): Observable<OperatorWallet> {
    return this.api.get<OperatorWallet>(`OperatorWallets/by-operator/${busOperatorId}`);
  }

  listLedgerEntries(busOperatorId?: string | null): Observable<PlatformLedger[]> {
    return this.api.get<PlatformLedger[]>('PlatformLedgers', { busOperatorId });
  }

  listCustomerWalletTransactions(): Observable<CustomerWalletTransaction[]> {
    return this.api.get<CustomerWalletTransaction[]>('CustomerWalletTransactions');
  }

  // ---- Settlements ----

  listSettlements(busOperatorId?: string | null): Observable<OperatorSettlement[]> {
    return this.api.get<OperatorSettlement[]>('OperatorSettlements', { busOperatorId });
  }

  getSettlement(id: string): Observable<OperatorSettlementDetail> {
    return this.api.get<OperatorSettlementDetail>(`OperatorSettlements/${id}`);
  }

  generateSettlement(request: SettlementGenerateRequest): Observable<OperatorSettlementDetail> {
    return this.api.post<OperatorSettlementDetail>('OperatorSettlements/generate', request);
  }

  approveSettlement(id: string, request: SettlementApproveRequest): Observable<void> {
    return this.api.post<void>(`OperatorSettlements/${id}/approve`, request);
  }

  // ---- Statements (read-only) ----

  listStatements(busOperatorId?: string | null): Observable<OperatorStatement[]> {
    return this.api.get<OperatorStatement[]>('OperatorStatements', { busOperatorId });
  }

  getStatement(id: string): Observable<OperatorStatementDetail> {
    return this.api.get<OperatorStatementDetail>(`OperatorStatements/${id}`);
  }

  // ---- Invoices & Payment Receipts ----

  listInvoices(busOperatorId?: string | null): Observable<OperatorInvoice[]> {
    return this.api.get<OperatorInvoice[]>('OperatorInvoices', { busOperatorId });
  }

  createInvoice(request: OperatorInvoiceCreateRequest): Observable<OperatorInvoice> {
    return this.api.post<OperatorInvoice>('OperatorInvoices', request);
  }

  issueInvoice(id: string): Observable<void> {
    return this.api.post<void>(`OperatorInvoices/${id}/issue`);
  }

  cancelInvoice(id: string, request: OperatorInvoiceActionRequest): Observable<void> {
    return this.api.post<void>(`OperatorInvoices/${id}/cancel`, request);
  }

  listReceipts(operatorInvoiceId?: string | null): Observable<OperatorPaymentReceipt[]> {
    return this.api.get<OperatorPaymentReceipt[]>('OperatorPaymentReceipts', { operatorInvoiceId });
  }

  recordReceipt(request: OperatorPaymentReceiptCreateRequest): Observable<OperatorPaymentReceipt> {
    return this.api.post<OperatorPaymentReceipt>('OperatorPaymentReceipts', request);
  }

  // ---- Payouts ----

  listPayouts(busOperatorId?: string | null): Observable<OperatorPayout[]> {
    return this.api.get<OperatorPayout[]>('OperatorPayouts', { busOperatorId });
  }

  createPayout(request: OperatorPayoutCreateRequest): Observable<OperatorPayout> {
    return this.api.post<OperatorPayout>('OperatorPayouts', request);
  }

  processPayout(id: string): Observable<void> {
    return this.api.post<void>(`OperatorPayouts/${id}/process`);
  }

  completePayout(id: string, request: OperatorPayoutCompleteRequest): Observable<OperatorPayout> {
    return this.api.post<OperatorPayout>(`OperatorPayouts/${id}/complete`, request);
  }

  failPayout(id: string, request: OperatorPayoutActionRequest): Observable<void> {
    return this.api.post<void>(`OperatorPayouts/${id}/fail`, request);
  }

  cancelPayout(id: string, request: OperatorPayoutActionRequest): Observable<void> {
    return this.api.post<void>(`OperatorPayouts/${id}/cancel`, request);
  }

  // ---- System Finance Config (Admin-only) ----

  listTaxRules(): Observable<TaxRule[]> {
    return this.api.get<TaxRule[]>('TaxRules');
  }

  createTaxRule(request: TaxRuleCreateRequest): Observable<TaxRule> {
    return this.api.post<TaxRule>('TaxRules', request);
  }

  updateTaxRule(id: string, request: TaxRuleUpdateRequest): Observable<TaxRule> {
    return this.api.put<TaxRule>(`TaxRules/${id}`, request);
  }

  deleteTaxRule(id: string): Observable<void> {
    return this.api.delete<void>(`TaxRules/${id}`);
  }

  listCurrencies(): Observable<Currency[]> {
    return this.api.get<Currency[]>('Currencies');
  }

  createCurrency(request: CurrencyCreateRequest): Observable<Currency> {
    return this.api.post<Currency>('Currencies', request);
  }

  updateCurrency(id: string, request: CurrencyUpdateRequest): Observable<Currency> {
    return this.api.put<Currency>(`Currencies/${id}`, request);
  }

  deleteCurrency(id: string): Observable<void> {
    return this.api.delete<void>(`Currencies/${id}`);
  }

  listPaymentProviders(): Observable<PaymentProvider[]> {
    return this.api.get<PaymentProvider[]>('PaymentProviders');
  }

  createPaymentProvider(request: PaymentProviderCreateRequest): Observable<PaymentProvider> {
    return this.api.post<PaymentProvider>('PaymentProviders', request);
  }

  updatePaymentProvider(id: string, request: PaymentProviderUpdateRequest): Observable<PaymentProvider> {
    return this.api.put<PaymentProvider>(`PaymentProviders/${id}`, request);
  }

  deletePaymentProvider(id: string): Observable<void> {
    return this.api.delete<void>(`PaymentProviders/${id}`);
  }

  listPaymentMethodConfigurations(): Observable<PaymentMethodConfiguration[]> {
    return this.api.get<PaymentMethodConfiguration[]>('PaymentMethodConfigurations');
  }

  createPaymentMethodConfiguration(
    request: PaymentMethodConfigurationCreateRequest,
  ): Observable<PaymentMethodConfiguration> {
    return this.api.post<PaymentMethodConfiguration>('PaymentMethodConfigurations', request);
  }

  updatePaymentMethodConfiguration(
    id: string,
    request: PaymentMethodConfigurationUpdateRequest,
  ): Observable<PaymentMethodConfiguration> {
    return this.api.put<PaymentMethodConfiguration>(`PaymentMethodConfigurations/${id}`, request);
  }

  deletePaymentMethodConfiguration(id: string): Observable<void> {
    return this.api.delete<void>(`PaymentMethodConfigurations/${id}`);
  }

  // ---- Finance reconciliation (Finance.Reconcile — Platform Finance/Admin only) ----
  // RBAC Amendment v3 / Chunk 7 task 4: the "confirmed bookings with no ledger rows"
  // list and its safe re-post action — see FinanceReconciliationController.

  listLedgerGaps(busOperatorId?: string | null): Observable<LedgerGap[]> {
    return this.api.get<LedgerGap[]>('FinanceReconciliation/ledger-gaps', { busOperatorId });
  }

  repostLedgerGap(bookingId: string): Observable<void> {
    return this.api.post<void>(`FinanceReconciliation/ledger-gaps/${bookingId}/repost`);
  }
}

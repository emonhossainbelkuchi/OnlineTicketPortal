// Mirrors OperatorWalletResponseDto. Read-only entity — FinanceLedgerService is the only writer.
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

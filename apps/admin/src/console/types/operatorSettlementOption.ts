// Minimal shape — just enough to render the Operator Settlement dropdown on Payout Create.
export interface OperatorSettlementOption {
  id: string;
  busOperatorId: string;
  settlementNo: string;
  fromDate: string;
  toDate: string;
  netAmount: number;
  status: string;
}

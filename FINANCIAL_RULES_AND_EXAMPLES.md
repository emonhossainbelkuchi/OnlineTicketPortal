# TicketPortal — Financial Rules & Worked Examples

Chunk 7 (Final Exam Completion Plan v2, amended by RBAC Amendment v3) deliverable: task 2
("Financial rules doc") and task 3 ("hand-checkable example"). Every rule below is transcribed
directly from the current code — `Services/FinanceLedgerService.cs`,
`Services/SettlementGenerationService.cs`, and the relevant parts of
`Services/PaymentConfirmationService.cs` — not from the concept doc or the completion plan, so
if this file and the code ever disagree, the code is right and this file is stale.

## 1. Who can read/write what (task 1)

| Permission | Granted to (PermissionMatrix.cs) | Covers |
| --- | --- | --- |
| `Finance.ReadPlatform` | Platform Finance, Admin | Read commission/tax/payment-provider/payment-method rules; read every operator's wallets/settlements/invoices/payouts |
| `Finance.ReadOwnOperator` | Operator Manager/BusOwner/Finance, Admin | Read their own operator's wallet/settlement/invoice/payout only |
| `Finance.Reconcile` | Platform Finance, Admin | §5 below — list and repost ledger gaps |
| `Settlement.Approve` | Platform Finance, Admin | Approve a Draft settlement (unchanged this chunk) |
| `Payout.Process` | Platform Finance, Admin | Process/complete/fail/cancel a payout (unchanged this chunk) |
| `Finance.Configure` | Admin only | Write commission/tax/payment-provider/payment-method rules |

Before this chunk, `CommissionRulesController`, `TaxRulesController`, `PaymentProvidersController`,
`PaymentMethodConfigurationsController`, and the read endpoints of the six
settlement/invoice/payout/wallet controllers all checked `User.IsInRole("Admin"/"Staff"/"Operator")`
instead — which either shut Platform Finance staff out of the numbers their job requires, or (for
the six read-scoped controllers) let *any* Staff/Operator account, including one with no finance
permission at all, see finance data outside its scope. That's now fixed to the table above; the
write/workflow endpoints of those six controllers (Generate, Approve, Create, Process, Complete,
Fail, Cancel) were out of this chunk's owner scope and are untouched.

## 2. Commission calculation

`PaymentConfirmationService.ComputeCommission(rule, booking.GrandTotal)` (the same logic is
duplicated, byte-for-byte, in the new `FinanceReconciliationService` for the §5 repost path):

```
Percentage:   commission = round(booking.GrandTotal * (rule.CommissionValue / 100), 2)
FixedAmount:  commission = rule.CommissionValue        // flat, ignores GrandTotal entirely
```

**Which rule applies** (`ResolveCommissionRuleAsync`): active rules for the operator + sale
channel (`Online` or `Counter`) where `EffectiveFrom <= today <= EffectiveTo` (or `EffectiveTo`
is null). If more than one matches, a rule scoped to the booking's specific `BusRouteId` wins
over the operator's general rule (`BusRouteId == null`). If none match at all, the ledger post
throws and the booking still confirms anyway — see §4.

## 3. What gets posted to the ledger

`FinanceLedgerService` is the only place allowed to write `PlatformLedger` rows or change
`OperatorWallet`'s cached numbers — every method does both in one transaction, so the wallet
"current balance" cache can never drift from what the ledger diary says happened.

**Online sale** (`PostOnlineSaleAsync`, called once per booking right after payment is confirmed):

| Row | Type | Amount |
| --- | --- | --- |
| Credit | `OnlineTicketSale` | `payment.Amount` (gross fare) — what we now owe the operator before deductions |
| Debit | `PlatformCommission` | commission from §2 |
| Debit *(only if `OperatorContract.GatewayFeeBearer == Operator`)* | `GatewayCharge` | `payment.GatewayFeeAmount` |

**Counter sale** (`PostCounterSaleCommissionAsync`, called once per booking on counter-sale
confirmation): a single Debit `CounterSaleCommission` row for the commission amount. No gross-fare
row is posted — the cash never touches the platform, only the ERP-usage commission the operator
owes us does.

**Refunds**: `PostRefundAsync` (online — Debit `Refund`, reverses the payout side) and
`PostCounterSaleRefundAsync` (counter — Credit `Refund`, reverses the commission the operator no
longer owes; prorated by ticket fare share and capped at what's left unreversed, see
`ResolveCounterSaleCommissionToReverseAsync`).

**Wallet effect** (`ApplyWalletDeltaAsync`): every posting above nets to one `receivableDelta`
(sum of that posting's credits minus debits). A positive delta increases
`OperatorReceivableFromPlatform`; a negative delta increases `PlatformReceivableFromOperator`;
either way `PendingSettlementBalance` moves by the signed delta. This uses a single
`ExecuteUpdateAsync` "add this delta" SQL statement rather than load-then-save, so concurrent
postings for the same operator can never clobber each other.

## 4. The gap this chunk closes: missing commission rules (task 4)

Both `ConfirmOnlinePaymentAsync` and `ConfirmCounterSaleAsync` wrap their ledger post in its own
`try`/`catch`, **by design** — a missing `CommissionRule` must never be the reason a customer who
has genuinely paid walks away without a ticket. On failure the booking still confirms and a
`LedgerWarning` string is returned in that one HTTP response... and nowhere else. It's never
written to the database. Worse, `PaymentConfirmationService`'s own idempotency path means a retry
of the same confirm call — which is exactly what you'd try after seeing the warning — returns the
already-cached "Succeeded" result *without* re-attempting the ledger post (`BuildIdempotentResultAsync`
never touches the ledger). So once a booking hits this gap, it stays a gap forever unless something
notices and fixes it by hand.

This chunk adds exactly that "notice and fix", with no schema change:

- **`GET /api/FinanceReconciliation/ledger-gaps`** (`Finance.Reconcile`) — every Confirmed/
  Completed/PartiallyCancelled booking whose expected ledger row doesn't exist: an
  `OnlineTicketSale` row for a `MoneyCollectedBy.Platform` booking, or a `CounterSaleCommission`
  row for a `MoneyCollectedBy.Operator` booking. Computed live against `PlatformLedger` every call,
  so the list itself can never drift out of sync with reality.
- **`POST /api/FinanceReconciliation/ledger-gaps/{bookingId}/repost`** (`Finance.Reconcile`) —
  re-resolves the commission rule (same lookup as §2) and calls the one `FinanceLedgerService`
  method the original flow would have called. Re-checks immediately before posting that the gap
  still exists, so calling it twice for the same booking is always safe — the second call sees the
  entry the first call just wrote and returns `400` ("already has a ... ledger entry — nothing to
  re-post") instead of posting a second one.

## 5. Idempotency (task 5)

Verified by reading (not by an automated test — see the scope note at the end of this file):

- **Settlement generation** (`SettlementGenerationService.GenerateAsync`) stamps
  `OperatorSettlementId` on every ledger row it sweeps into a settlement
  (`.Where(l => l.OperatorSettlementId == null ...)`). Re-running generation over the same date
  range a second time finds zero unswept rows for that range and throws
  `"No unsettled ledger entries..."` — it cannot produce a duplicate settlement.
- **Payment confirmation** is idempotent at the payment level: `ConfirmOnlinePaymentAsync`/
  `ConfirmCounterSaleAsync` check `payment.Status` first, and a payment already `Succeeded` returns
  `BuildIdempotentResultAsync`'s cached result rather than re-running the confirm flow (which is
  also exactly why §4's gap can persist — see above).
- **`FinanceLedgerService` itself has no built-in duplicate guard** — `PostOnlineSaleAsync`/
  `PostCounterSaleCommissionAsync` always add a new row if called. Safety comes entirely from each
  caller calling it at most once per booking (the payment-status check above, and — for the new §4
  repost path — the "does a row already exist" check immediately before posting).

## 6. Hand-checkable example

**Example A — the plan's numbers.** Green Line, online booking, `GrandTotal` = 1,000 BDT,
`CommissionRule` = `Percentage` 10%, gateway fee 0 (or the operator's contract has
`GatewayFeeBearer.Platform`, so no `GatewayCharge` row is posted either way):

```
commission = round(1000 * 0.10, 2) = 100
Ledger:  Credit 1000 OnlineTicketSale
         Debit   100 PlatformCommission
Net owed to Green Line for this booking = 1000 - 100 = 900 BDT
```

Then one counter sale for Green Line, `GrandTotal` = whatever the ticket cost, `CommissionRule` =
`FixedAmount` 10 (flat, ignores `GrandTotal`):

```
commission = 10   (FixedAmount ignores GrandTotal entirely)
Ledger:  Debit 10 CounterSaleCommission
Green Line now owes the platform 10 BDT for this one counter ticket
```

Settling both together: `netAmount = (1000 credit - 100 debit) + (0 - 10 debit) = 900 - 10 = 890`.
`890 > 0` ⇒ `SettlementDirection.PlatformPaysOperator` ⇒ **TicketPortal pays Green Line 890 BDT.**

**Example B — with a gateway fee, straight from `FinanceLedgerService.PostOnlineSaleAsync`'s own
code comment** (included because it's the one case Example A's numbers don't exercise: the
`GatewayFeeBearer.Operator` branch). Customer pays 1,000 BDT online, commission 10%, gateway's own
fee is 20 BDT, and the operator's contract says *they* bear that fee:

```
commission = round(1000 * 0.10, 2) = 100
Ledger:  Credit 1000 OnlineTicketSale
         Debit   100 PlatformCommission
         Debit    20 GatewayCharge        (only posted because GatewayFeeBearer == Operator)
Net owed to the operator for this one booking = 1000 - 100 - 20 = 880 BDT
```

If `GatewayFeeBearer` had instead been `Platform`, the third row is never posted and the operator
is owed the full 900 — the platform absorbs the 20 BDT fee itself instead.

*(Automated reproduction of these two examples as an xUnit test is deferred to Chunk 10 — see the
scope note below; the exact Arrange/Act/Assert values above are written so they can be transcribed
directly into a test once `apps/api.tests` exists.)*

## 7. What Chunk 7 does NOT cover (scope note)

Per the completion plan's own priority note ("if time is short, finish all P0 tasks in every
chunk before starting any P1"), this delivery covers tasks 1–6 (all P0) and deliberately leaves
the three P1 tasks for a follow-up pass:

- **Task 7** — printable/exportable operator statement.
- **Task 8** — a read-only "my earnings" screen for the Operator Finance/Manager role (today they
  can read settlements/invoices/payouts/wallets via the fixed permissions in §1, but there's no
  single summary screen built for them yet).
- **Task 9** — refund/cancellation impact tests specifically exercising the ledger-reversal math in
  §3.

Also out of scope by the plan's own file-ownership boundaries, not by omission: the
write/workflow endpoints of the six settlement/invoice/payout/wallet controllers (Generate,
Approve, Create, Process, Complete, Fail, Cancel) — this chunk's owner scope for those six
controllers was read-scoping only.

No database migration was needed for any of this — §4's reconciliation list is a live query
against existing tables, not a new column or flag.

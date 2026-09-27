using Microsoft.EntityFrameworkCore;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using TicketPortal.Api.Services;
using TicketPortal.Api.Tests.Infrastructure;
using Xunit;

namespace TicketPortal.Api.Tests.Integration
{
    // Chunk 10 "first tests": settlement hand-check. Same direct-service-call approach and
    // same "own fresh, zero-noise BusOperator" reasoning as FinanceLedgerServiceTests — see
    // that file's class comment. Using a brand-new operator here specifically means
    // GenerateSettlementAsync's date-range query picks up ONLY the entries this test posts,
    // so every expected number below is an exact hand-calculated value, not a delta against
    // whatever demo data happens to contain.
    [Collection(SharedApiCollection.Name)]
    public class SettlementGenerationServiceTests
    {
        private readonly TicketPortalWebApplicationFactory _factory;

        public SettlementGenerationServiceTests(TicketPortalWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private static async Task<Guid> CreateFreshOperatorWithWalletAsync(AppDbContext db)
        {
            var op = new BusOperator { Name = $"Settlement Test Operator {Guid.NewGuid():N}" };
            db.BusOperators.Add(op);
            db.OperatorWallets.Add(new OperatorWallet { BusOperatorId = op.Id });
            await db.SaveChangesAsync();
            return op.Id;
        }

        private static async Task<Guid> FindAnyBookingIdWithChannelAsync(AppDbContext db, MoneyCollectedBy channel)
        {
            var id = await db.Bookings.Where(b => b.MoneyCollectedBy == channel).Select(b => b.Id).FirstOrDefaultAsync();
            Assert.True(id != Guid.Empty, $"No seeded Booking with MoneyCollectedBy = {channel} found — has DemoDataSeeder changed?");
            return id;
        }

        [Fact]
        public async Task GenerateSettlementAsync_NetsOnlineSaleCounterCommissionAndRefund_IntoOneCorrectFigure()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);
            var settlementService = new SettlementGenerationService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var onlineBookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Platform);
            var counterBookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Operator);

            // Hand-calculated ledger, all posted "now" so a single-day settlement window
            // catches everything and nothing else (this operator has no other history):
            //   Online sale:      gross 1000, commission 100, gateway 20 (operator-borne) -> credit 1000, debit 120
            //   Counter commission: 50                                                     -> debit 50
            //   Refund (online):  120                                                       -> debit 120
            // Net = 1000 - 100 - 20 - 50 - 120 = 710 (platform still owes the operator).
            await ledger.PostOnlineSaleAsync(onlineBookingId, operatorId, 1000m, 100m, 20m, GatewayFeeBearer.Operator);
            await ledger.PostCounterSaleCommissionAsync(counterBookingId, operatorId, 50m);
            await ledger.PostRefundAsync(onlineBookingId, null, operatorId, 120m);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var settlement = await settlementService.GenerateSettlementAsync(operatorId, today, today);

            Assert.Equal(710m, settlement.NetAmount);
            Assert.Equal(SettlementDirection.PlatformPaysOperator, settlement.Direction);
            Assert.Equal(1000m, settlement.OnlineGrossAmount);
            Assert.Equal(150m, settlement.PlatformCharge); // 100 (platform commission) + 50 (counter commission)
            Assert.Equal(20m, settlement.GatewayCharge);
            Assert.Equal(120m, settlement.RefundAmount);
            Assert.Equal(SettlementStatus.Draft, settlement.Status);
            Assert.Equal(4, settlement.Items.Count); // One item per ledger row.

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(0m, wallet.PendingSettlementBalance); // Fully swept — 710 (pending) - 710 (netAmount) = 0.
            Assert.Equal(710m, wallet.AvailablePayoutBalance); // Platform owes operator -> added to payout balance.

            // Every ledger row must be stamped so it's never picked up by a later settlement.
            var stillUnstamped = await db.PlatformLedgers.CountAsync(l => l.BusOperatorId == operatorId && l.OperatorSettlementId == null);
            Assert.Equal(0, stillUnstamped);
        }

        [Fact]
        public async Task GenerateSettlementAsync_WhenOperatorOwesPlatform_RaisesAnInvoice_InsteadOfAPayout()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);
            var settlementService = new SettlementGenerationService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var counterBookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Operator);

            // Only a counter-sale commission this period, nothing owed the other way ->
            // net = -50 (operator owes the platform).
            await ledger.PostCounterSaleCommissionAsync(counterBookingId, operatorId, 50m);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var settlement = await settlementService.GenerateSettlementAsync(operatorId, today, today);

            Assert.Equal(-50m, settlement.NetAmount);
            Assert.Equal(SettlementDirection.OperatorPaysPlatform, settlement.Direction);

            var invoice = await db.OperatorInvoices.AsNoTracking().SingleAsync(i => i.BusOperatorId == operatorId);
            Assert.Equal(50m, invoice.Amount); // -netAmount, i.e. a positive amount owed.
            Assert.Equal(invoice.Id, settlement.OperatorInvoiceId); // Settlement points at the invoice it raised.
            Assert.Equal(settlement.OperatorStatementId, invoice.OperatorStatementId); // Both trace back to the same statement.
            Assert.Equal(InvoiceStatus.Draft, invoice.Status);

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(0m, wallet.AvailablePayoutBalance); // Nothing to pay out — it became an invoice instead.
        }

        [Fact]
        public async Task GenerateSettlementAsync_Throws_WhenThereIsNothingUnsettledInRange()
        {
            // Makes re-running the same range a safe no-op at the controller level (per the
            // method's own doc comment) — this is what stops a duplicate/empty settlement.
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var settlementService = new SettlementGenerationService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db); // No ledger rows posted at all.
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                settlementService.GenerateSettlementAsync(operatorId, today, today));
        }

        [Fact]
        public async Task GenerateSettlementAsync_ASecondCallForTheSameRange_FindsNothingLeftToSettle()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);
            var settlementService = new SettlementGenerationService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var bookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Operator);
            await ledger.PostCounterSaleCommissionAsync(bookingId, operatorId, 30m);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            await settlementService.GenerateSettlementAsync(operatorId, today, today);

            // Same range again — the one ledger row is already stamped with an
            // OperatorSettlementId, so this must now throw the same "nothing unsettled" error,
            // not silently create a second, empty/duplicate settlement.
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                settlementService.GenerateSettlementAsync(operatorId, today, today));

            var settlementCount = await db.OperatorSettlements.CountAsync(s => s.BusOperatorId == operatorId);
            Assert.Equal(1, settlementCount);
        }
    }
}

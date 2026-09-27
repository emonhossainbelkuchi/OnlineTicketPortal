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
    // Chunk 10 "first tests": ledger formulas (online, counter, refunds). Calls
    // FinanceLedgerService directly (resolved from the real DI container via a service scope,
    // against the real LocalDB) rather than through an HTTP endpoint, because there is no
    // single controller action that calls these methods in isolation — they're invoked from
    // deep inside PaymentConfirmationService/RefundProcessingService. This is the one place in
    // the suite that intentionally tests a service directly instead of over HTTP; see the
    // class-level comment on why that's still a meaningful, hand-checkable test.
    //
    // Every test here creates its OWN throwaway BusOperator + OperatorWallet (zero pre-existing
    // ledger rows) rather than reusing seeded demo data, specifically so the expected numbers
    // below are exact, hand-calculated values — not "seeded total plus a delta" — with zero risk
    // of DemoDataSeeder's own data changing the answer.
    [Collection(SharedApiCollection.Name)]
    public class FinanceLedgerServiceTests
    {
        private readonly TicketPortalWebApplicationFactory _factory;

        public FinanceLedgerServiceTests(TicketPortalWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private static async Task<Guid> CreateFreshOperatorWithWalletAsync(AppDbContext db)
        {
            var op = new BusOperator { Name = $"Ledger Test Operator {Guid.NewGuid():N}" };
            db.BusOperators.Add(op);
            db.OperatorWallets.Add(new OperatorWallet { BusOperatorId = op.Id });
            await db.SaveChangesAsync();
            return op.Id;
        }

        // FinanceLedgerService.EnsureMoneyCollectedByAsync only checks the referenced
        // Booking's MoneyCollectedBy value — it does not require that booking to belong to the
        // busOperatorId parameter being posted against (see the method's own source). So it's
        // enough to borrow the *existence and channel* of any already-seeded booking; the
        // ledger/wallet numbers this test asserts on all belong to our own fresh operator.
        private static async Task<Guid> FindAnyBookingIdWithChannelAsync(AppDbContext db, MoneyCollectedBy channel)
        {
            var id = await db.Bookings.Where(b => b.MoneyCollectedBy == channel).Select(b => b.Id).FirstOrDefaultAsync();
            Assert.True(id != Guid.Empty, $"No seeded Booking with MoneyCollectedBy = {channel} found — has DemoDataSeeder changed?");
            return id;
        }

        [Fact]
        public async Task PostOnlineSaleAsync_SplitsGrossFareIntoCommissionAndGatewayCharge_AndCreditsOperatorTheRemainder()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var bookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Platform);

            // Hand-calculated, per the method's own doc comment example:
            //   Customer pays 1000 online. Commission 100. Gateway fee 20, borne by the operator.
            //   -> Operator is owed 1000 - 100 - 20 = 880.
            await ledger.PostOnlineSaleAsync(
                bookingId, operatorId,
                grossFare: 1000m, platformCommission: 100m, gatewayCharge: 20m,
                gatewayFeeBearer: GatewayFeeBearer.Operator);

            var entries = await db.PlatformLedgers.AsNoTracking()
                .Where(l => l.BusOperatorId == operatorId).ToListAsync();
            Assert.Equal(3, entries.Count);
            Assert.Equal(1000m, entries.Single(e => e.ItemType == StatementItemType.OnlineTicketSale).CreditAmount);
            Assert.Equal(100m, entries.Single(e => e.ItemType == StatementItemType.PlatformCommission).DebitAmount);
            Assert.Equal(20m, entries.Single(e => e.ItemType == StatementItemType.GatewayCharge).DebitAmount);

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(880m, wallet.OperatorReceivableFromPlatform);
            Assert.Equal(0m, wallet.PlatformReceivableFromOperator);
            Assert.Equal(880m, wallet.PendingSettlementBalance);
            Assert.Equal(1000m, wallet.TotalOnlineSalesAmount);
        }

        [Fact]
        public async Task PostOnlineSaleAsync_DoesNotChargeTheOperatorForTheGatewayFee_WhenThePlatformBearsIt()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var bookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Platform);

            await ledger.PostOnlineSaleAsync(
                bookingId, operatorId,
                grossFare: 500m, platformCommission: 50m, gatewayCharge: 15m,
                gatewayFeeBearer: GatewayFeeBearer.Platform); // <- platform bears it this time

            var entries = await db.PlatformLedgers.AsNoTracking().Where(l => l.BusOperatorId == operatorId).ToListAsync();
            Assert.Equal(2, entries.Count); // No GatewayCharge row at all — see the method's own comment.
            Assert.DoesNotContain(entries, e => e.ItemType == StatementItemType.GatewayCharge);

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(450m, wallet.OperatorReceivableFromPlatform); // 500 - 50, no gateway deduction.
        }

        [Fact]
        public async Task PostCounterSaleCommissionAsync_ChargesTheOperatorCommission_WithNoGrossSaleEntry()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var bookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Operator);

            await ledger.PostCounterSaleCommissionAsync(bookingId, operatorId, commissionAmount: 50m);

            var entries = await db.PlatformLedgers.AsNoTracking().Where(l => l.BusOperatorId == operatorId).ToListAsync();
            var entry = Assert.Single(entries);
            Assert.Equal(StatementItemType.CounterSaleCommission, entry.ItemType);
            Assert.Equal(50m, entry.DebitAmount);
            Assert.Equal(0m, entry.CreditAmount); // The cash itself never touched the platform.

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(0m, wallet.OperatorReceivableFromPlatform);
            Assert.Equal(50m, wallet.PlatformReceivableFromOperator); // Operator now owes the platform.
            Assert.Equal(-50m, wallet.PendingSettlementBalance);
            Assert.Equal(50m, wallet.TotalCounterSalesAmount);
        }

        [Fact]
        public async Task PostRefundAsync_ReversesAnOnlineSale_AndReducesWhatThePlatformOwesTheOperator()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var bookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Platform);

            await ledger.PostOnlineSaleAsync(bookingId, operatorId, 1000m, 100m, 0m, GatewayFeeBearer.Operator);
            // Wallet is now: OperatorReceivableFromPlatform = 900, PendingSettlementBalance = 900.

            await ledger.PostRefundAsync(bookingId, refundId: null, operatorId, refundAmount: 300m);

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(600m, wallet.PendingSettlementBalance); // 900 - 300.

            var refundEntry = await db.PlatformLedgers.AsNoTracking()
                .SingleAsync(l => l.BusOperatorId == operatorId && l.ItemType == StatementItemType.Refund);
            Assert.Equal(300m, refundEntry.DebitAmount);
        }

        [Fact]
        public async Task PostCounterSaleRefundAsync_GivesBackExactlyTheCommissionThatWasReversed()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var bookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Operator);

            await ledger.PostCounterSaleCommissionAsync(bookingId, operatorId, commissionAmount: 80m);
            // Wallet is now: PlatformReceivableFromOperator = 80, PendingSettlementBalance = -80.

            await ledger.PostCounterSaleRefundAsync(bookingId, refundId: null, operatorId, commissionToReverse: 80m);

            var wallet = await db.OperatorWallets.AsNoTracking().SingleAsync(w => w.BusOperatorId == operatorId);
            Assert.Equal(0m, wallet.PlatformReceivableFromOperator); // Fully reversed.
            Assert.Equal(0m, wallet.PendingSettlementBalance);
            Assert.Equal(0m, wallet.TotalCounterSalesAmount); // Reversed back out too.
        }

        [Fact]
        public async Task PostOnlineSaleAsync_Throws_WhenTheBookingWasActuallyACounterSale()
        {
            // EnsureMoneyCollectedByAsync's whole job: catch "wrong posting method called for
            // this booking" immediately instead of writing incorrect numbers into the books.
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ledger = new FinanceLedgerService(db);

            var operatorId = await CreateFreshOperatorWithWalletAsync(db);
            var counterBookingId = await FindAnyBookingIdWithChannelAsync(db, MoneyCollectedBy.Operator);

            await Assert.ThrowsAsync<LedgerChannelMismatchException>(() =>
                ledger.PostOnlineSaleAsync(counterBookingId, operatorId, 1000m, 100m, 0m, GatewayFeeBearer.Operator));

            var entries = await db.PlatformLedgers.CountAsync(l => l.BusOperatorId == operatorId);
            Assert.Equal(0, entries); // Nothing written — the guard fired before any posting.
        }
    }
}

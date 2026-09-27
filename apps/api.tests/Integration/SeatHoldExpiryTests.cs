using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Services;
using TicketPortal.Api.Tests.Infrastructure;
using Xunit;

namespace TicketPortal.Api.Tests.Integration
{
    // Chunk 10 "first tests": hold expiry. Creates a real hold over HTTP (same as
    // SeatHoldConcurrencyTests), backdates ONLY its HoldExpiresAtUtc directly in the DB (there
    // is no HTTP way to fast-forward a clock, and SeatHoldExpirySweepService itself is a
    // background timer that would make this test slow and non-deterministic to wait on) — then
    // calls SeatHoldService.ExpireOverdueHoldsAsync() directly, which is exactly the method
    // that hosted service calls on its own timer. This is the one seat-hold test that reaches
    // into a service directly rather than only over HTTP, and it's for arranging an otherwise-
    // untestable time condition, not for skipping the business logic under test.
    [Collection(SharedApiCollection.Name)]
    public class SeatHoldExpiryTests
    {
        private readonly TicketPortalWebApplicationFactory _factory;

        public SeatHoldExpiryTests(TicketPortalWebApplicationFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task AnOverdueHold_IsFreedByTheSweep_AndTheSeatBecomesAvailableAgain()
        {
            Guid tripId;
            Guid tripSeatId;
            using (var scope = _factory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                // PlatformManaged filter: same reasoning as SeatHoldConcurrencyTests — since
                // Chunk 8, an ExternalApiManaged trip (Hanif in demo data) makes
                // SeatHoldsController.Create call out to ExternalBookingSyncService first. That
                // fails open safely with nothing listening on Integrations:HanifErpBaseUrl, but
                // it's an unrelated dependency this expiry test has no business exercising.
                var candidate = await db.TripSeats
                    .Where(ts => ts.Status == TripSeatStatus.Available)
                    .Where(ts => ts.Trip.Status == TripStatus.Scheduled && ts.Trip.DepartureTimeUtc > DateTime.UtcNow)
                    .Where(ts => ts.Trip.BusOperator.InventoryMode == OperatorInventoryMode.PlatformManaged)
                    .Select(ts => new { ts.Id, ts.TripId })
                    .FirstAsync();
                tripId = candidate.TripId;
                tripSeatId = candidate.Id;
            }

            var customerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.Customer, DemoAccounts.Password);
            var createResponse = await customerClient.PostAsJsonAsync(
                "/api/seatholds", new { TripId = tripId, TripSeatIds = new[] { tripSeatId } });
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

            Guid seatHoldId;
            using (var scope = _factory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var seat = await db.TripSeats.AsNoTracking().SingleAsync(ts => ts.Id == tripSeatId);
                Assert.Equal(TripSeatStatus.Held, seat.Status);
                Assert.NotNull(seat.CurrentSeatHoldId);
                seatHoldId = seat.CurrentSeatHoldId!.Value;

                // Backdate the hold as if its 3-5 minute window had already passed — the only
                // part of this test that isn't a normal HTTP call, and it only manipulates time,
                // not the hold's status (that's exactly what the sweep itself must decide).
                await db.SeatHolds
                    .Where(h => h.Id == seatHoldId)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(h => h.HoldExpiresAtUtc, DateTime.UtcNow.AddMinutes(-1)));
            }

            using (var scope = _factory.CreateScope())
            {
                var seatHoldService = scope.ServiceProvider.GetRequiredService<SeatHoldService>();
                var expiredCount = await seatHoldService.ExpireOverdueHoldsAsync();
                Assert.True(expiredCount >= 1, "Expected the sweep to find and expire at least the hold this test just backdated.");
            }

            using var verifyScope = _factory.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();

            var seatAfterSweep = await verifyDb.TripSeats.AsNoTracking().SingleAsync(ts => ts.Id == tripSeatId);
            Assert.Equal(TripSeatStatus.Available, seatAfterSweep.Status);
            Assert.Null(seatAfterSweep.CurrentSeatHoldId);

            var holdAfterSweep = await verifyDb.SeatHolds.AsNoTracking().SingleAsync(h => h.Id == seatHoldId);
            Assert.Equal(SeatHoldStatus.Expired, holdAfterSweep.Status);

            // Freed seat must be immediately holdable again by someone else — the whole point
            // of expiry (Chunk 3's original bug: seats stayed Held forever).
            var anotherAttempt = await customerClient.PostAsJsonAsync(
                "/api/seatholds", new { TripId = tripId, TripSeatIds = new[] { tripSeatId } });
            Assert.Equal(HttpStatusCode.Created, anotherAttempt.StatusCode);
        }

        [Fact]
        public async Task ExpireOverdueHoldsAsync_DoesNotTouchAHoldThatIsNotYetDue()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var candidate = await db.TripSeats
                .Where(ts => ts.Status == TripSeatStatus.Available)
                .Where(ts => ts.Trip.Status == TripStatus.Scheduled && ts.Trip.DepartureTimeUtc > DateTime.UtcNow)
                .Where(ts => ts.Trip.BusOperator.InventoryMode == OperatorInventoryMode.PlatformManaged)
                .Select(ts => new { ts.Id, ts.TripId })
                .Skip(1) // A different seat than the previous test touched, since they share a database.
                .FirstAsync();

            var customerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.Customer, DemoAccounts.Password);
            var createResponse = await customerClient.PostAsJsonAsync(
                "/api/seatholds", new { TripId = candidate.TripId, TripSeatIds = new[] { candidate.Id } });
            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

            var seatHoldService = scope.ServiceProvider.GetRequiredService<SeatHoldService>();
            await seatHoldService.ExpireOverdueHoldsAsync();

            var seatAfterSweep = await db.TripSeats.AsNoTracking().SingleAsync(ts => ts.Id == candidate.Id);
            Assert.Equal(TripSeatStatus.Held, seatAfterSweep.Status); // Still held — its 3-5 minute window hasn't passed.
        }
    }
}

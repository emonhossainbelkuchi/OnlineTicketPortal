using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Scheduling;
using TicketPortal.Api.Tests.Infrastructure;
using Xunit;

namespace TicketPortal.Api.Tests.Integration
{
    // Chunk 10 "first tests": hold race + trip-state gating, both against the real
    // POST /api/seatholds endpoint over real HTTP (SeatHoldsController -> SeatHoldService).
    [Collection(SharedApiCollection.Name)]
    public class SeatHoldConcurrencyTests
    {
        private readonly TicketPortalWebApplicationFactory _factory;

        public SeatHoldConcurrencyTests(TicketPortalWebApplicationFactory factory)
        {
            _factory = factory;
        }

        // Finds a TripSeat that is currently Available on a Trip that is itself still
        // sellable (Scheduled/Boarding/Delayed with a future departure) — arranging test data
        // by reading the DB directly is fine; the seat hold itself always happens over HTTP.
        //
        // Deliberately excludes ExternalApiManaged operators (Hanif in demo data): since
        // Chunk 8, SeatHoldsController.Create calls out to ExternalBookingSyncService for those
        // trips before ever reaching SeatHoldService, which — with nothing actually listening
        // at Integrations:HanifErpBaseUrl during a test run — exercises Chunk 8's fail-open
        // path (safe, but an unrelated dependency) instead of the plain internal race/gating
        // logic this file is testing. Chunk 8's own integration behavior belongs in a test file
        // of its own, not folded into this one by accident of which seat got picked.
        private async Task<(Guid tripId, Guid tripSeatId)> FindAnAvailableSeatAsync()
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var candidate = await db.TripSeats
                .Where(ts => ts.Status == TripSeatStatus.Available)
                .Where(ts => ts.Trip.Status == TripStatus.Scheduled && ts.Trip.DepartureTimeUtc > DateTime.UtcNow)
                .Where(ts => ts.Trip.BusOperator.InventoryMode == OperatorInventoryMode.PlatformManaged)
                .Select(ts => new { ts.Id, ts.TripId })
                .FirstOrDefaultAsync();

            Assert.True(candidate != null,
                "No Available TripSeat found on a future Scheduled trip for a PlatformManaged " +
                "operator in seeded demo data — DemoDataSeeder may have changed. This test needs " +
                "at least one such seat to exist.");

            return (candidate!.TripId, candidate.Id);
        }

        [Fact]
        public async Task TwoSimultaneousHoldRequests_ForTheSameSeat_OnlyOneSucceeds()
        {
            var (tripId, tripSeatId) = await FindAnAvailableSeatAsync();

            var customerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.Customer, DemoAccounts.Password);
            var payload = new { TripId = tripId, TripSeatIds = new[] { tripSeatId } };

            // Fire both requests concurrently on the SAME client, targeting the SAME seat —
            // SeatHoldService.HoldSeatsAsync is supposed to resolve the race with one atomic
            // "UPDATE TripSeat SET Status = Held WHERE Status = Available" (see its own
            // comments), not with an application-level check-then-act that both requests could
            // pass at once.
            var firstRequest = customerClient.PostAsJsonAsync("/api/seatholds", payload);
            var secondRequest = customerClient.PostAsJsonAsync("/api/seatholds", payload);
            var responses = await Task.WhenAll(firstRequest, secondRequest);

            var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
            var conflictCount = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

            Assert.Equal(1, successCount);
            Assert.Equal(1, conflictCount);

            // And the database agrees: the seat is Held by exactly one active SeatHold, not
            // double-booked and not still Available.
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var seat = await db.TripSeats.AsNoTracking().SingleAsync(ts => ts.Id == tripSeatId);
            Assert.Equal(TripSeatStatus.Held, seat.Status);

            var activeHoldsOnThisSeat = await db.SeatHoldItems
                .Where(item => item.TripSeatId == tripSeatId)
                .Join(db.SeatHolds, item => item.SeatHoldId, hold => hold.Id, (item, hold) => hold)
                .CountAsync(hold => hold.Status == SeatHoldStatus.Active);
            Assert.Equal(1, activeHoldsOnThisSeat);
        }

        [Fact]
        public async Task HoldRequest_OnACancelledTrip_IsRefusedWithConflict_NotSilentlyAccepted()
        {
            // Chunk 3 task 1 / TripSellability: a trip whose Status is Cancelled must never be
            // holdable even if its DepartureTimeUtc is still in the future. Build one directly
            // (arrange-by-DB, same as FindAnAvailableSeatAsync above) rather than depending on
            // demo data happening to include a cancelled future trip.
            Guid tripId;
            Guid tripSeatId;
            using (var scope = _factory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                // Clone the shape of an existing Scheduled trip's seat so every required FK
                // (bus, route, terminals, operator) is already valid, then just flip Status.
                // Same PlatformManaged filter as FindAnAvailableSeatAsync above, and for the
                // same reason — keeps this test isolated to the internal trip-state check.
                var template = await db.TripSeats
                    .Where(ts => ts.Status == TripSeatStatus.Available)
                    .Where(ts => ts.Trip.Status == TripStatus.Scheduled && ts.Trip.DepartureTimeUtc > DateTime.UtcNow)
                    .Where(ts => ts.Trip.BusOperator.InventoryMode == OperatorInventoryMode.PlatformManaged)
                    .Select(ts => ts.TripId)
                    .FirstAsync();

                var trip = await db.Trips.FirstAsync(t => t.Id == template);
                trip.Status = TripStatus.Cancelled;
                tripId = trip.Id;

                tripSeatId = await db.TripSeats
                    .Where(ts => ts.TripId == tripId && ts.Status == TripSeatStatus.Available)
                    .Select(ts => ts.Id)
                    .FirstAsync();

                await db.SaveChangesAsync();
            }

            var customerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.Customer, DemoAccounts.Password);
            var response = await customerClient.PostAsJsonAsync(
                "/api/seatholds", new { TripId = tripId, TripSeatIds = new[] { tripSeatId } });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

            using var verifyScope = _factory.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var seat = await verifyDb.TripSeats.AsNoTracking().SingleAsync(ts => ts.Id == tripSeatId);
            Assert.Equal(TripSeatStatus.Available, seat.Status); // Untouched — the refusal must not have side effects.
        }
    }
}

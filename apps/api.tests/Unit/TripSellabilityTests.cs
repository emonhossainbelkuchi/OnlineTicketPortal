using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Services;
using Xunit;

namespace TicketPortal.Api.Tests.Unit
{
    // "Trip-state gating" from the Chunk 10 test list. TripSellability is a pure static
    // class with no EF/DB dependency (see Services/TripSellability.cs) — the one place
    // TripsController.Search, BookingBusesController and SeatHoldService all agree on what
    // "not bookable" means (Chunk 3, gap register #1). A real LocalDB round trip for this
    // logic would be integration-test overkill; this file is a fast, dependency-free unit
    // test, and Integration/SeatHoldConcurrencyTests.cs separately confirms the same rule is
    // actually enforced end-to-end through the real HTTP endpoint.
    public class TripSellabilityTests
    {
        private static readonly DateTime Now = new(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

        [Theory]
        [InlineData(TripStatus.Cancelled)]
        [InlineData(TripStatus.Departed)]
        [InlineData(TripStatus.Running)]
        [InlineData(TripStatus.Arrived)]
        [InlineData(TripStatus.Completed)]
        public void IsSellable_ReturnsFalse_ForEveryNonBookableStatus_EvenWithAFutureDeparture(TripStatus status)
        {
            // A same-day trip cancelled an hour ago still has a future DepartureTimeUtc — the
            // whole point of this rule (per the source comment) is that status wins regardless
            // of the clock.
            var futureDeparture = Now.AddHours(2);

            Assert.False(TripSellability.IsSellable(status, futureDeparture, Now));
        }

        [Theory]
        [InlineData(TripStatus.Scheduled)]
        [InlineData(TripStatus.Boarding)]
        [InlineData(TripStatus.Delayed)]
        public void IsSellable_ReturnsTrue_ForBookableStatuses_WithAFutureDeparture(TripStatus status)
        {
            var futureDeparture = Now.AddHours(2);

            Assert.True(TripSellability.IsSellable(status, futureDeparture, Now));
        }

        [Fact]
        public void IsSellable_ReturnsFalse_OnceDepartureTimeHasPassed_EvenIfStatusIsStillScheduled()
        {
            // The operator hasn't gotten around to flipping the status yet — the clock alone
            // must still close sales.
            var pastDeparture = Now.AddMinutes(-1);

            Assert.False(TripSellability.IsSellable(TripStatus.Scheduled, pastDeparture, Now));
        }

        [Fact]
        public void IsSellable_RespectsConfigurableStopSalesWindow()
        {
            var departsIn10Minutes = Now.AddMinutes(10);
            var stopSalesWindow = TimeSpan.FromMinutes(15);

            // Departure is only 10 minutes out but the configured window wants sales closed 15
            // minutes ahead of departure — must already be unsellable.
            Assert.False(TripSellability.IsSellable(TripStatus.Scheduled, departsIn10Minutes, Now, stopSalesWindow));

            // Comfortably outside the window — still sellable.
            var departsIn30Minutes = Now.AddMinutes(30);
            Assert.True(TripSellability.IsSellable(TripStatus.Scheduled, departsIn30Minutes, Now, stopSalesWindow));
        }

        [Fact]
        public void IsSellable_DefaultStopSalesWindowOfZero_ReproducesTheOldDepartureTimeOnlyCutoff()
        {
            // StopSalesMinutesBeforeDeparture defaults to 0 in appsettings.json specifically
            // to reproduce old behaviour — one second before departure must still be sellable.
            var oneSecondBeforeDeparture = Now.AddSeconds(1);

            Assert.True(TripSellability.IsSellable(TripStatus.Scheduled, oneSecondBeforeDeparture, Now));
        }

        [Theory]
        [InlineData(TripStatus.Cancelled, "cancelled")]
        [InlineData(TripStatus.Departed, "already departed")]
        [InlineData(TripStatus.Running, "already departed")]
        [InlineData(TripStatus.Arrived, "already finished")]
        [InlineData(TripStatus.Completed, "already finished")]
        public void GetUnsellableReason_GivesAStatusSpecificMessage(TripStatus status, string expectedFragment)
        {
            var reason = TripSellability.GetUnsellableReason(status, Now.AddHours(2), Now);

            Assert.Contains(expectedFragment, reason, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public void GetUnsellableReason_DistinguishesClockCutoff_FromConfiguredStopSalesWindow()
        {
            var alreadyDeparted = TripSellability.GetUnsellableReason(TripStatus.Scheduled, Now.AddMinutes(-1), Now);
            Assert.Contains("already departed", alreadyDeparted, StringComparison.OrdinalIgnoreCase);

            var closedAheadOfDeparture = TripSellability.GetUnsellableReason(
                TripStatus.Scheduled, Now.AddMinutes(5), Now, TimeSpan.FromMinutes(15));
            Assert.Contains("closed ahead of departure", closedAheadOfDeparture, StringComparison.OrdinalIgnoreCase);
        }
    }
}

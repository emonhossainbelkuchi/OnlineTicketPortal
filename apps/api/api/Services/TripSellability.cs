using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.Services
{
    // Chunk 3 (Search correctness & seat-hold integrity), gap register #1: "the non-bookable
    // statuses list is currently duplicated in TripsController.Search and
    // BookingBusesController" — and SeatHoldService.HoldSeatsAsync didn't check trip state at
    // all, so a trip that was correctly hidden from search could still be held by calling
    // POST /api/seatholds directly. This is now the one place all three agree on what "not
    // bookable" means, so that can't happen again.
    public static class TripSellability
    {
        // Trip.Status values that mean "not sellable any more", independent of the clock — a
        // same-day trip the operator marked Cancelled an hour ago still has a future
        // DepartureTimeUtc and must NOT show up (or be holdable) just because the clock hasn't
        // caught up. This is the exact 5-status list that already existed independently in
        // TripsController.Search and BookingBusesController — deliberately unchanged (not
        // extended to Boarding/Delayed/Scheduled, which remain normal sellable states); moving
        // it here removes the duplication without changing which trips are bookable today.
        public static readonly IReadOnlyCollection<TripStatus> NonBookableStatuses = new[]
        {
            TripStatus.Cancelled,
            TripStatus.Departed,
            TripStatus.Running,
            TripStatus.Arrived,
            TripStatus.Completed,
        };

        // stopSalesWindow: how long before a still-Scheduled departure sales close. Defaulting
        // to TimeSpan.Zero reproduces exactly the old behaviour (closed only once the clock
        // passes DepartureTimeUtc); a deployment can tighten this via the SeatHold config
        // section (see SeatHoldService/SeatHoldsController/TripsController/
        // BookingBusesController, all of which read the same SeatHold:StopSalesMinutesBeforeDeparture
        // key) without touching this method.
        public static bool IsSellable(
            TripStatus status,
            DateTime departureTimeUtc,
            DateTime nowUtc,
            TimeSpan stopSalesWindow = default)
        {
            if (NonBookableStatuses.Contains(status))
            {
                return false;
            }

            return departureTimeUtc > nowUtc.Add(stopSalesWindow);
        }

        // Same inputs as IsSellable, but a customer/staff-facing reason for why a hold was
        // refused (Chunk 3 task 1: "Return a clear 4xx message; Angular shows it and refreshes
        // results") instead of a generic "trip not found"-shaped error. Only meaningful to call
        // when IsSellable(...) has already returned false.
        public static string GetUnsellableReason(
            TripStatus status,
            DateTime departureTimeUtc,
            DateTime nowUtc,
            TimeSpan stopSalesWindow = default)
        {
            switch (status)
            {
                case TripStatus.Cancelled:
                    return "This trip has been cancelled and can no longer be booked.";
                case TripStatus.Departed:
                case TripStatus.Running:
                    return "This trip has already departed.";
                case TripStatus.Arrived:
                case TripStatus.Completed:
                    return "This trip has already finished.";
            }

            if (departureTimeUtc <= nowUtc)
            {
                return "This trip has already departed.";
            }

            if (departureTimeUtc <= nowUtc.Add(stopSalesWindow))
            {
                return "Booking for this trip has closed ahead of departure.";
            }

            return "This trip is not available for booking.";
        }
    }
}

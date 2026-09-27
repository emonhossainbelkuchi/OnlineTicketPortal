using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // One outcome row per booking the cascade touched — returned to TripsController.Cancel so
    // the response (and, via the Angular cancel dialog, the operator) can see exactly what
    // happened to each booking rather than just a bare success/failure for the whole trip.
    public class TripCancelledBookingOutcome
    {
        public Guid BookingId { get; init; }
        public Guid? RefundId { get; init; }

        // "Succeeded" / "PendingManualPayout" / "ReconciliationNeeded" (RefundStatus, as a
        // string so a "Skipped"/"Failed" outcome — no Refund ever got created — has somewhere
        // to live too, without forcing RefundStatus to grow a value that doesn't belong to it).
        public string Outcome { get; init; } = string.Empty;
        public string? Detail { get; init; }
    }

    public class TripCancellationResult
    {
        public Guid TripId { get; init; }
        public int ReleasedHoldCount { get; init; }
        public int BookingsRefunded { get; set; }
        public int BookingsNeedingAttention { get; set; }
        public List<TripCancelledBookingOutcome> Bookings { get; init; } = new();
    }

    // Chunk 5, P0 task 1 ("Trip cancel cascade ... concept: cancelled trip -> customers
    // refunded"). Before this existed, flipping Trip.Status to Cancelled through
    // TripsController.Update only ever wrote a TripStatusHistory row (Appendix A gap #2) —
    // active holds stayed locked, Confirmed bookings were completely untouched, and their
    // tickets stayed Issued/CheckedIn forever even though the bus was never going to run.
    // This is the one place a Trip is ever actually cancelled end-to-end: status + history,
    // seat-hold release, and a full, no-fee refund for every booking that was actually paid
    // for, in that order.
    //
    // Deliberately reuses CancellationProcessingService + RefundProcessingService for the
    // refund side instead of posting to FinanceLedgerService or touching Ticket/Booking rows
    // directly — an operator-cancelled refund needs exactly the same downstream effects
    // (ticket/booking status flips, seat release, online-wallet-credit vs
    // counter-commission-reversal branching, ledger entries) as an ordinary customer-approved
    // one; only WHO pays the cancellation fee changes (nobody — see
    // CancellationProcessingService.RequestAsync's operatorInitiated flag). This class is the
    // orchestration on top, not a second implementation of either service's own job.
    public class TripCancellationService
    {
        private readonly AppDbContext _db;
        private readonly SeatHoldService _seatHoldService;
        private readonly CancellationProcessingService _cancellationProcessingService;
        private readonly RefundProcessingService _refundProcessingService;

        public TripCancellationService(
            AppDbContext db,
            SeatHoldService seatHoldService,
            CancellationProcessingService cancellationProcessingService,
            RefundProcessingService refundProcessingService)
        {
            _db = db;
            _seatHoldService = seatHoldService;
            _cancellationProcessingService = cancellationProcessingService;
            _refundProcessingService = refundProcessingService;
        }

        public async Task<TripCancellationResult> CancelTripAsync(Guid tripId, Guid? cancelledByUserId, string reason)
        {
            var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == tripId)
                ?? throw new InvalidOperationException($"Trip {tripId} does not exist.");

            if (!TripStatusTransitionRules.CanCancel(trip.Status))
            {
                throw new InvalidOperationException(
                    trip.Status == TripStatus.Cancelled
                        ? $"Trip {tripId} is already cancelled."
                        : $"A trip in {trip.Status} status cannot be cancelled.");
            }

            // -----------------------------------------------------------------
            // a. Status + history. Saved on its own, before anything downstream, so the trip
            // is already correctly marked Cancelled (and gone from search — see
            // TripsController.Search's nonBookableStatuses filter) even if a later step in
            // this method throws partway through a long list of bookings.
            // -----------------------------------------------------------------
            trip.Status = TripStatus.Cancelled;
            _db.TripStatusHistories.Add(new TripStatusHistory
            {
                TripId = trip.Id,
                ChangedByUserId = cancelledByUserId,
                Status = TripStatus.Cancelled,
                ChangedAtUtc = DateTime.UtcNow,
                Remarks = reason,
            });
            await _db.SaveChangesAsync();

            // -----------------------------------------------------------------
            // b. Release every still-active seat hold on this trip — a customer mid-checkout
            // on a trip that no longer exists must not keep their seat locked for the rest of
            // the hold's timer, and any Draft/PendingPayment booking waiting on one of those
            // holds is closed out as Cancelled by the same call (see
            // SeatHoldService.ReleaseActiveHoldsForTripAsync).
            // -----------------------------------------------------------------
            var releasedHoldCount = await _seatHoldService.ReleaseActiveHoldsForTripAsync(tripId, reason);

            // -----------------------------------------------------------------
            // c/d. Full refund + ticket/booking status flip for every booking that was
            // actually paid for. PartiallyCancelled is included deliberately — a booking with
            // some tickets already individually cancelled still has real, paid-for tickets
            // outstanding on a trip that is now never running, and RequestAsync's own
            // "what's still outstanding" base-amount calculation (shared with the
            // customer-initiated path) already prices exactly that remainder, not the
            // booking's original GrandTotal.
            // -----------------------------------------------------------------
            var affectedBookingIds = await _db.Bookings
                .Where(b => b.TripId == tripId
                    && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.PartiallyCancelled))
                .Select(b => b.Id)
                .ToListAsync();

            var result = new TripCancellationResult { TripId = tripId, ReleasedHoldCount = releasedHoldCount };

            foreach (var bookingId in affectedBookingIds)
            {
                var outcome = await RefundOneBookingAsync(bookingId, cancelledByUserId, reason);
                result.Bookings.Add(outcome);

                if (outcome.Outcome is "Skipped" or "Failed")
                {
                    result.BookingsNeedingAttention++;
                }
                else
                {
                    result.BookingsRefunded++;
                }
            }

            return result;
        }

        // One booking's full trip through Request -> Approve (cancellation) -> Approve ->
        // Process (refund) -> Complete (cancellation). Isolated per booking and never lets an
        // exception escape — a problem with ONE booking's refund (e.g. its own earlier data
        // already being in an odd state) must never stop every OTHER booking on the same trip
        // from being refunded; it just gets flagged in the result for staff to look at.
        private async Task<TripCancelledBookingOutcome> RefundOneBookingAsync(
            Guid bookingId, Guid? cancelledByUserId, string reason)
        {
            try
            {
                var cancellationRequest = await _cancellationProcessingService.RequestAsync(
                    bookingId,
                    ticketId: null,
                    requestedByUserId: cancelledByUserId,
                    reason: string.IsNullOrWhiteSpace(reason) ? "Trip cancelled by operator." : reason,
                    operatorInitiated: true);

                // No override — RequestAsync (operatorInitiated) already set
                // RequestedRefundAmount to the full outstanding fare, and ApproveAsync's own
                // ceiling is computed the exact same way, so the two always agree.
                await _cancellationProcessingService.ApproveAsync(
                    cancellationRequest.Id,
                    cancelledByUserId,
                    approvedRefundAmountOverride: null,
                    remarks: "Automatic full refund — trip cancelled by operator, no cancellation fee.");

                var refund = await _db.Refunds
                    .Where(r => r.CancellationRequestId == cancellationRequest.Id)
                    .OrderByDescending(r => r.RequestedAtUtc)
                    .FirstAsync();

                await _refundProcessingService.ApproveAsync(refund.Id, "Auto-approved — operator-cancelled trip.");
                await _refundProcessingService.ProcessAsync(refund.Id);

                // Same AppDbContext/change-tracker instance throughout this whole call chain
                // (all four services are resolved from the same request-scoped DI container),
                // so `refund` already reflects whatever ProcessAsync just set — no re-query
                // needed to see the final status.
                if (refund.Status == RefundStatus.Succeeded)
                {
                    try
                    {
                        await _cancellationProcessingService.CompleteAsync(cancellationRequest.Id);
                    }
                    catch (InvalidOperationException)
                    {
                        // Vanishingly unlikely (ProcessAsync just set Succeeded on this same
                        // tracked instance a moment ago) — if it somehow happens, leave the
                        // CancellationRequest at Approved for staff to close out by hand rather
                        // than losing the refund result over a bookkeeping step.
                    }
                }

                return new TripCancelledBookingOutcome
                {
                    BookingId = bookingId,
                    RefundId = refund.Id,
                    Outcome = refund.Status.ToString(),
                };
            }
            catch (CancellationConflictException ex)
            {
                // A cancellation for this booking is already Requested/Approved (e.g. the
                // customer beat the operator to it) — nothing more to do here, and definitely
                // not a reason to stop refunding every OTHER booking on this trip.
                return new TripCancelledBookingOutcome { BookingId = bookingId, Outcome = "Skipped", Detail = ex.Message };
            }
            catch (Exception ex)
            {
                // Covers both CancellationProcessingService/RefundProcessingService's own
                // InvalidOperationException guards and anything ProcessAsync's Stage 2 (wallet
                // credit) rethrows after already marking the refund ReconciliationNeeded — the
                // refund row and its real status (if one was created) still exist for staff to
                // find; this only stops THIS booking's loop iteration from throwing out of the
                // whole cascade.
                return new TripCancelledBookingOutcome { BookingId = bookingId, Outcome = "Failed", Detail = ex.Message };
            }
        }
    }
}

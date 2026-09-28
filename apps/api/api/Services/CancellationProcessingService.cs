using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.Scheduling;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
    // Thrown when a request would step on an already-in-progress cancellation for the same
    // booking/ticket. Mirrors SeatsUnavailableException's role in SeatHoldService: a
    // predictable "someone already did this" case that a controller should turn into 409,
    // not the generic 400 used for plain validation failures.
    public class CancellationConflictException : Exception
    {
        public CancellationConflictException(string message) : base(message) { }
    }

    // Orchestrates a CancellationRequest from Requested through Approved/Rejected to
    // Completed. Before this existed, CancellationRequestsController let a customer submit a
    // cancellation AND set their own ApprovedRefundAmount/Status in the same raw POST — this
    // is what makes an approval actually mean "staff reviewed it, and the refund amount came
    // from the real CancellationPolicy", the same way RefundProcessingService did for refunds
    // themselves.
    //
    // On approval this creates the Refund row AND immediately drives it through
    // RefundProcessingService.ApproveAsync/ProcessAsync (see the comment at the end of
    // ApproveAsync below for why) — Reject/Complete on an *independent* Refund (e.g. the one
    // PaymentConfirmationService creates automatically when held seats are lost after payment,
    // see Services/PaymentConfirmationService.cs) still only move through RefundsController's
    // own actions; this class only ever drives the one Refund it just created itself.
    public class CancellationProcessingService
    {
        private readonly AppDbContext _db;
        private readonly SeatHoldService _seatHoldService;
        private readonly ExternalBookingSyncService _externalSync;
        private readonly RefundProcessingService _refundProcessingService;

        public CancellationProcessingService(
            AppDbContext db, SeatHoldService seatHoldService, ExternalBookingSyncService externalSync,
            RefundProcessingService refundProcessingService)
        {
            _db = db;
            _seatHoldService = seatHoldService;
            _externalSync = externalSync;
            _refundProcessingService = refundProcessingService;
        }

        // Customer-initiated (or staff, on the customer's behalf) — ties the request to the
        // trip's real CancellationPolicy and computes the refund percentage/fee from how close
        // to departure this is, rather than trusting whatever amount the client sends.
        //
        // operatorInitiated (Chunk 5, TripCancellationService): the trip itself is being
        // called off by the operator, not the customer backing out — so (a) the usual
        // "already departed" guard is skipped, because a Delayed trip being cancelled can
        // easily already be past its original DepartureTimeUtc, and that's exactly the case
        // this path exists to still allow refunding; and (b) the refund is always the full
        // outstanding fare with the CancellationPolicy's percentage/fee tiers never consulted
        // — a customer should never be charged a cancellation fee for a trip THEY didn't
        // cancel. Everything else (duplicate-request guard, ticket/booking status guard,
        // "what's still outstanding" base-amount calculation, CancellationRequest shape) is
        // shared as-is with the customer-initiated path below, so the two can never drift
        // apart on anything except price.
        public async Task<CancellationRequest> RequestAsync(
            Guid bookingId, Guid? ticketId, Guid? requestedByUserId, string reason, bool operatorInitiated = false)
        {
            var booking = await _db.Bookings
                .Include(b => b.Tickets)
                .FirstOrDefaultAsync(b => b.Id == bookingId)
                ?? throw new InvalidOperationException($"Booking {bookingId} does not exist.");

            Ticket? ticket = null;
            if (ticketId.HasValue)
            {
                ticket = booking.Tickets.FirstOrDefault(t => t.Id == ticketId.Value)
                    ?? throw new InvalidOperationException(
                        $"Ticket {ticketId} does not belong to booking {bookingId}.");

                if (ticket.Status is TicketStatus.Cancelled or TicketStatus.Refunded)
                {
                    throw new InvalidOperationException(
                        $"Ticket {ticketId} is already {ticket.Status} and cannot be cancelled again.");
                }
            }
            else if (booking.Status is BookingStatus.Cancelled or BookingStatus.Refunded or BookingStatus.Completed)
            {
                throw new InvalidOperationException(
                    $"Booking {bookingId} is {booking.Status} and cannot be cancelled.");
            }

            // Without this, a customer could spam duplicate requests for the same
            // booking/ticket while an earlier one is still Requested/Approved.
            var alreadyOpen = await _db.CancellationRequests.AnyAsync(cr =>
                cr.BookingId == bookingId
                && (ticketId == null ? cr.TicketId == null : cr.TicketId == ticketId)
                && (cr.Status == CancellationRequestStatus.Requested || cr.Status == CancellationRequestStatus.Approved));

            if (alreadyOpen)
            {
                throw new CancellationConflictException(
                    "A cancellation request for this booking/ticket is already in progress.");
            }

            var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == booking.TripId)
                ?? throw new InvalidOperationException($"Trip for booking {bookingId} no longer exists.");

            if (!operatorInitiated && trip.DepartureTimeUtc <= DateTime.UtcNow)
            {
                throw new InvalidOperationException(
                    "This trip has already departed; it can no longer be cancelled.");
            }

            // For a whole-booking request, the refundable base is what's actually still
            // outstanding — the fare of tickets not already Cancelled/Refunded — not the
            // booking's original GrandTotal. Without this, requesting a whole-booking
            // cancellation AFTER an earlier per-ticket cancellation was already refunded (the
            // booking is PartiallyCancelled, which is deliberately still allowed to reach this
            // point — cancelling "the rest" of a booking is a legitimate ask) would compute its
            // refund off money that includes a ticket that's already been paid back, risking a
            // double refund once approved.
            var baseAmount = ticket != null
                ? ticket.FinalFare
                : booking.Tickets
                    .Where(t => t.Status is not (TicketStatus.Cancelled or TicketStatus.Refunded))
                    .Sum(t => t.FinalFare);

            decimal requestedRefundAmount;
            decimal? appliedRefundPercentage = null;
            decimal? appliedFixedCancellationFee = null;
            if (operatorInitiated)
            {
                // The operator failed to run the trip at all — this is not the customer paying
                // to back out, so the CancellationPolicy's percentage/fee ladder never applies.
                // Full refund of whatever is still outstanding, no fee deducted.
                requestedRefundAmount = baseAmount;
            }
            else
            {
                var policy = await ResolveCancellationPolicyAsync(trip);
                var hoursBeforeDeparture = (trip.DepartureTimeUtc - DateTime.UtcNow).TotalHours;

                // Pick the tightest-fitting tier (closest to departure that still qualifies), the
                // same way a "cancel within 24h = X%, within 72h = Y%" ladder is meant to be read.
                var rule = policy?.Rules
                    .Where(r => hoursBeforeDeparture >= r.MinHoursBeforeDeparture
                        && (r.MaxHoursBeforeDeparture == null || hoursBeforeDeparture <= r.MaxHoursBeforeDeparture))
                    .OrderByDescending(r => r.MinHoursBeforeDeparture)
                    .FirstOrDefault();

                // No policy configured at all, or no rule covers this window, both fall back to
                // a 0% refund rather than blocking the request outright — staff can still
                // override the amount at Approve time (e.g. a goodwill exception), so this only
                // affects the default a customer sees, never the final say.
                requestedRefundAmount = rule == null
                    ? 0m
                    : Math.Max(0m, baseAmount * (rule.RefundPercentage / 100m) - rule.FixedCancellationFee);

                appliedRefundPercentage = rule?.RefundPercentage ?? 0m;
                appliedFixedCancellationFee = rule?.FixedCancellationFee ?? 0m;
            }

            var cancellationRequest = new CancellationRequest
            {
                BookingId = bookingId,
                TicketId = ticketId,
                RequestedByUserId = requestedByUserId,
                Status = CancellationRequestStatus.Requested,
                Reason = reason,
                // Snapshot of what the amount below was computed from — see the field
                // comments on CancellationRequest itself for why this exists: without it,
                // BookingGrandTotal (paid, includes tax/service charge) and
                // RequestedRefundAmount (fare-only, policy-adjusted) look like a data bug to
                // anyone comparing them without this context.
                BaseAmount = baseAmount,
                BookingGrandTotalAtRequest = booking.GrandTotal,
                AppliedRefundPercentage = appliedRefundPercentage,
                AppliedFixedCancellationFee = appliedFixedCancellationFee,
                RequestedRefundAmount = requestedRefundAmount,
                RequestedAtUtc = DateTime.UtcNow,
            };

            _db.CancellationRequests.Add(cancellationRequest);
            await _db.SaveChangesAsync();

            return cancellationRequest;
        }

        // Staff review step. Sets the cancellation itself to Approved, reflects the
        // cancellation on the Ticket/Booking, and creates the Refund row — but does not touch
        // the Refund's own Approve/Process flow, which stays RefundsController's job.
        public async Task ApproveAsync(
            Guid cancellationRequestId, Guid? approvedByUserId, decimal? approvedRefundAmountOverride, string? remarks)
        {
            var cr = await _db.CancellationRequests
                .Include(c => c.Booking).ThenInclude(b => b.Tickets)
                .FirstOrDefaultAsync(c => c.Id == cancellationRequestId)
                ?? throw new InvalidOperationException($"CancellationRequest {cancellationRequestId} does not exist.");

            if (cr.Status != CancellationRequestStatus.Requested)
            {
                throw new InvalidOperationException(
                    $"CancellationRequest {cancellationRequestId} is {cr.Status}; only a Requested cancellation can be approved.");
            }

            var booking = cr.Booking;
            // Same reasoning as RequestAsync's baseAmount above: a whole-booking approval's
            // ceiling has to be what's still outstanding on the booking right now, not the
            // original GrandTotal — otherwise approving this could authorize refunding a
            // ticket a second time if some of the booking's tickets were already individually
            // cancelled and refunded before this request was made.
            var ceiling = cr.TicketId.HasValue
                ? booking.Tickets.FirstOrDefault(t => t.Id == cr.TicketId.Value)?.FinalFare ?? 0m
                : booking.Tickets
                    .Where(t => t.Status is not (TicketStatus.Cancelled or TicketStatus.Refunded))
                    .Sum(t => t.FinalFare);

            // Client decision (Chunk X follow-up): staff discretion here was actively being
            // misused — an admin could type any figure in the Approve prompt and it would
            // silently become the paid-out amount, with nothing tying it back to what the
            // CancellationPolicy actually computed. So this is no longer a ceiling check with
            // staff free to land anywhere under it — the approved amount must equal exactly
            // what RequestAsync computed and stored as RequestedRefundAmount. Passing null
            // (the prompt's "leave blank") is the only way to approve; a non-null override
            // that doesn't match is rejected outright rather than clamped or averaged, so the
            // error is loud instead of a silently-different number landing on the refund.
            if (approvedRefundAmountOverride.HasValue && approvedRefundAmountOverride.Value != cr.RequestedRefundAmount)
            {
                throw new InvalidOperationException(
                    $"Approved refund amount must equal the policy-calculated amount ({cr.RequestedRefundAmount}) " +
                    "for this request — leave it blank to accept that amount.");
            }

            var approvedAmount = cr.RequestedRefundAmount;
            if (approvedAmount < 0 || approvedAmount > ceiling)
            {
                throw new InvalidOperationException(
                    $"Approved refund amount must be between 0 and {ceiling} for this " +
                    $"{(cr.TicketId.HasValue ? "ticket" : "booking")}.");
            }

            var payment = await _db.Payments
                .Where(p => p.BookingId == booking.Id && p.Status == PaymentStatus.Succeeded)
                .OrderByDescending(p => p.PaidAtUtc)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException(
                    $"No successful payment found for booking {booking.Id}; nothing to refund.");

            cr.Status = CancellationRequestStatus.Approved;
            cr.ApprovedByUserId = approvedByUserId;
            cr.ApprovedRefundAmount = approvedAmount;
            cr.ApprovedAtUtc = DateTime.UtcNow;
            cr.UpdatedAtUtc = DateTime.UtcNow;

            // Reflect the cancellation on the ticket/booking themselves — this is what actually
            // takes the seat out of "sold" state from the customer's point of view. Each
            // cancelled ticket's TripSeatId is collected here so the seats can be handed to
            // SeatHoldService below — it's still the ONLY class allowed to change
            // TripSeat.Status; this service just tells it which seats are now free again.
            var cancelledTripSeatIds = new List<Guid>();

            if (cr.TicketId.HasValue)
            {
                var ticket = booking.Tickets.First(t => t.Id == cr.TicketId.Value);
                ticket.Status = TicketStatus.Cancelled;
                ticket.CancelledAtUtc = DateTime.UtcNow;
                cancelledTripSeatIds.Add(ticket.TripSeatId);

                var allCancelled = booking.Tickets.All(t => t.Status == TicketStatus.Cancelled);
                if (allCancelled)
                {
                    booking.Status = BookingStatus.Cancelled;
                    booking.CancelledAtUtc = DateTime.UtcNow;
                    booking.CancellationReason = cr.Reason;
                }
                else if (booking.Status != BookingStatus.Cancelled)
                {
                    booking.Status = BookingStatus.PartiallyCancelled;
                }
            }
            else
            {
                foreach (var t in booking.Tickets.Where(t => t.Status != TicketStatus.Cancelled))
                {
                    t.Status = TicketStatus.Cancelled;
                    t.CancelledAtUtc = DateTime.UtcNow;
                    cancelledTripSeatIds.Add(t.TripSeatId);
                }

                booking.Status = BookingStatus.Cancelled;
                booking.CancelledAtUtc = DateTime.UtcNow;
                booking.CancellationReason = cr.Reason;
            }

            // Hand off to RefundProcessingService's world from here on — this only creates the
            // Refund at Requested, exactly like PaymentConfirmationService's own automatic-
            // refund path does. Approve/Process (and the RefundHistory trail that comes with
            // them) stay RefundProcessingService's job; this service never duplicates that logic.
            var refund = new Refund
            {
                BookingId = booking.Id,
                PaymentId = payment.Id,
                CancellationRequestId = cr.Id,
                Amount = approvedAmount,
                Currency = payment.Currency,
                Status = RefundStatus.Requested,
                Reason = string.IsNullOrWhiteSpace(remarks)
                    ? $"Cancellation approved: {cr.Reason}"
                    : $"Cancellation approved: {cr.Reason} ({remarks})",
                RequestedAtUtc = DateTime.UtcNow,
            };

            _db.Refunds.Add(refund);

            // Everything above is a tracked-entity change (cr/ticket(s)/booking/refund), saved
            // together below. The seat release is a separate, immediate ExecuteUpdateAsync call
            // on this same AppDbContext (see SeatHoldService.ReleaseCancelledSeatsAsync) — an
            // explicit transaction around both is what keeps this step honest with the rest of
            // the class's own invariant ("every method either fully succeeds or fully rolls
            // back"), instead of risking a cancelled ticket on record with its seat still stuck
            // as Booked if the release step were ever to fail on its own.
            await using var transaction = await _db.Database.BeginTransactionAsync();

            await _db.SaveChangesAsync();
            await _seatHoldService.ReleaseCancelledSeatsAsync(booking.Id, cancelledTripSeatIds);

            await transaction.CommitAsync();

            // Chunk 8 task 7 (P1): best-effort propagation to the operator's own ERP, AFTER the
            // refund/seat-release transaction above has already committed — a failure here must
            // never undo or block the cancellation itself (see
            // ExternalBookingSyncService.TryCancelExternalBookingAsync, which never throws and
            // is a no-op for a booking that was never synced with an operator ERP in the first
            // place, i.e. every PlatformManaged booking).
            await _externalSync.TryCancelExternalBookingAsync(booking.Id);

            // Client decision (dashboard follow-up): leaving the linked Refund sitting at
            // Requested meant the Admin Overview's Online Gross/Commission and Refunds figures
            // never moved right after an approval — those are computed straight off the
            // FinanceLedgerService ledger, which only gets its Refund entry from
            // RefundProcessingService.ProcessAsync's Stage 1, not from a CancellationRequest
            // being Approved. So a cancellation approval here now drives the Refund through
            // both of RefundProcessingService's own steps immediately, instead of leaving it
            // for staff to separately find in the Refunds resource and push through by hand.
            // Same best-effort shape as the ERP sync line above: the cancellation itself is
            // already committed, so a failure here (e.g. a guest refund parking at
            // PendingManualPayout after Stage 1, which is not a failure, or a genuine Stage 2
            // wallet-credit problem landing it on ReconciliationNeeded) is left for staff to
            // find via the Refund's own status/history rather than rolled back into an
            // exception that would make the caller think the cancellation itself didn't go
            // through.
            try
            {
                await _refundProcessingService.ApproveAsync(refund.Id, remarks);
                await _refundProcessingService.ProcessAsync(refund.Id);
            }
            catch
            {
                // Swallowed deliberately — see the comment above. The Refund's own row
                // (Approved/Processing/Failed/ReconciliationNeeded/PendingManualPayout) is the
                // source of truth for what happened next, not this method's return.
            }
        }

        public async Task RejectAsync(Guid cancellationRequestId, string rejectedReason)
        {
            var cr = await _db.CancellationRequests.FirstOrDefaultAsync(c => c.Id == cancellationRequestId)
                ?? throw new InvalidOperationException($"CancellationRequest {cancellationRequestId} does not exist.");

            if (cr.Status != CancellationRequestStatus.Requested)
            {
                throw new InvalidOperationException(
                    $"CancellationRequest {cancellationRequestId} is {cr.Status}; only a Requested cancellation can be rejected.");
            }

            cr.Status = CancellationRequestStatus.Rejected;
            cr.RejectedReason = rejectedReason;
            cr.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        // Explicit closing step, called once staff have taken the linked Refund all the way to
        // Succeeded through RefundsController's own Approve/Process actions. Kept as its own
        // step (rather than something RefundProcessingService.ProcessAsync triggers
        // automatically) because that service is shared, already-shipped code — see its own
        // file — and isn't touched here to reach back into this workflow.
        public async Task CompleteAsync(Guid cancellationRequestId)
        {
            var cr = await _db.CancellationRequests.FirstOrDefaultAsync(c => c.Id == cancellationRequestId)
                ?? throw new InvalidOperationException($"CancellationRequest {cancellationRequestId} does not exist.");

            if (cr.Status != CancellationRequestStatus.Approved)
            {
                throw new InvalidOperationException(
                    $"CancellationRequest {cancellationRequestId} is {cr.Status}; only an Approved cancellation can be completed.");
            }

            var refundSucceeded = await _db.Refunds.AnyAsync(r =>
                r.CancellationRequestId == cr.Id && r.Status == RefundStatus.Succeeded);

            if (!refundSucceeded)
            {
                throw new InvalidOperationException(
                    "The linked refund has not succeeded yet — approve and process it through RefundsController first.");
            }

            cr.Status = CancellationRequestStatus.Completed;
            cr.CompletedAtUtc = DateTime.UtcNow;
            cr.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        private async Task<CancellationPolicy?> ResolveCancellationPolicyAsync(Trip trip)
        {
            if (trip.CancellationPolicyId.HasValue)
            {
                var tripPolicy = await _db.CancellationPolicies
                    .Include(p => p.Rules)
                    .FirstOrDefaultAsync(p => p.Id == trip.CancellationPolicyId.Value && p.IsActive);

                if (tripPolicy != null) return tripPolicy;
            }

            // Fall back to the platform-wide default (BusOperatorId == null) if the trip
            // doesn't have its own policy, or its own has since been deactivated.
            return await _db.CancellationPolicies
                .Include(p => p.Rules)
                .Where(p => p.BusOperatorId == null && p.IsActive)
                .OrderByDescending(p => p.CreatedAtUtc)
                .FirstOrDefaultAsync();
        }
    }
}

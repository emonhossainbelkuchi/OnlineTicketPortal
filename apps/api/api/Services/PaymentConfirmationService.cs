using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using TicketPortal.Api.Models.Payments;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Services
{
  public enum PaymentConfirmationOutcome
  {
    Confirmed,
    PaidButSeatsLost
  }

  public class PaymentConfirmationResult
  {
    public PaymentConfirmationOutcome Outcome { get; set; }
    public Payment Payment { get; set; } = default!;
    public Booking? Booking { get; set; }
    public List<Ticket> Tickets { get; set; } = new();
    public Refund? AutoRefund { get; set; }

    // Set only if the booking/ticket side fully succeeded but the ledger posting failed
    // (e.g. missing CommissionRule config). Never block a paying customer's ticket on a
    // finance configuration problem — surface it here instead so it can be reconciled.
    public string? LedgerWarning { get; set; }
  }

  // This is the ONLY place in the codebase allowed to call
  // SeatHoldService.ConvertHoldToBookingAsync and FinanceLedgerService.PostOnlineSaleAsync
  // for an online payment — together, every time — so a booking can never end up confirmed
  // without a ledger entry, or vice versa. Before this class existed, PaymentsController
  // wrote straight to the Payments table and never called either service.
  public class PaymentConfirmationService
  {
    private readonly AppDbContext _db;
    private readonly SeatHoldService _seatHoldService;
    private readonly FinanceLedgerService _financeLedgerService;
    private readonly IConfiguration _configuration;

    public PaymentConfirmationService(
        AppDbContext db,
        SeatHoldService seatHoldService,
        FinanceLedgerService financeLedgerService,
        IConfiguration configuration)
    {
      _db = db;
      _seatHoldService = seatHoldService;
      _financeLedgerService = financeLedgerService;
      _configuration = configuration;
    }

    // Step 3 of checkout: the customer picked a payment method for a booking that came
    // from an active hold. Amount is always taken from the booking's own GrandTotal —
    // never from the caller — so a request can't just declare its own price.
    //
    // holdToken is still taken from the caller (matches the checkout session's own state)
    // but is now cross-checked against Booking.SeatHoldId — the actual source of truth for
    // which hold this booking was created from (set at BookingsController.Create) — not
    // merely against the booking's TripId. A same-trip-but-different-hold token used to pass
    // this check; see the same fix in SeatHoldService.ConvertHoldToBookingAsync for why that
    // mattered.
    public async Task<Payment> InitiatePaymentAsync(
        Guid bookingId,
        string holdToken,
        PaymentMethod method,
        Guid? paymentProviderId)
    {
      var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId)
          ?? throw new InvalidOperationException($"Booking {bookingId} does not exist.");

      if (booking.Status != BookingStatus.PendingPayment && booking.Status != BookingStatus.Draft)
      {
        throw new InvalidOperationException(
            $"Booking {bookingId} is {booking.Status} and can no longer accept a payment.");
      }

      var hold = await _db.SeatHolds.FirstOrDefaultAsync(h => h.HoldToken == holdToken)
          ?? throw new InvalidOperationException("This hold token is invalid.");

      if (hold.Id != booking.SeatHoldId)
      {
        throw new InvalidOperationException("This hold does not belong to this booking.");
      }

      var gateway = PaymentGateway.None;
      if (paymentProviderId.HasValue)
      {
        var provider = await _db.PaymentProviders
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == paymentProviderId.Value && p.IsActive)
            ?? throw new InvalidOperationException("The selected payment provider is not available.");

        var enabledMethod = await _db.PaymentMethodConfigurations.AnyAsync(c =>
            c.PaymentProviderId == provider.Id &&
            c.Method == method &&
            c.IsActive);

        if (!enabledMethod)
        {
          throw new InvalidOperationException("The selected payment method is not available from that provider.");
        }

        gateway = provider.Gateway;
      }

      var payment = new Payment
      {
        BookingId = booking.Id,
        PaymentProviderId = paymentProviderId,
        Method = method,
        Gateway = gateway,
        CollectedBy = booking.MoneyCollectedBy,
        Amount = booking.GrandTotal,
        Currency = booking.Currency,
        Status = PaymentStatus.Initiated,
        TransactionDateUtc = DateTime.UtcNow,
      };

      _db.Payments.Add(payment);
      await _db.SaveChangesAsync();

      _db.PaymentHistories.Add(new PaymentHistory
      {
        PaymentId = payment.Id,
        Status = PaymentStatus.Initiated,
        Remarks = "Payment attempt started."
      });
      await _db.SaveChangesAsync();

      return payment;
    }

    // Step 4: the gateway (or, until a real one is wired in, whatever calls this — see the
    // TODO on PaymentsController.Confirm) says the money arrived. From here, three things
    // must happen together: the hold becomes a real booking, tickets get issued, and the
    // sale gets posted to the commission ledger.
    // Chunk 4 P0 task 3 ("do not trust client-sent gateway fee"): the caller-supplied fee is
    // no longer trusted for the ledger — see clientReportedGatewayFeeAmount's own comment
    // below for what still happens with it. Parameter kept (not removed) so
    // PaymentsController.Confirm/PaymentGatewayResultDto don't need a breaking contract
    // change; a real gateway integration would eventually replace this whole parameter with
    // a verified webhook payload anyway (see the TODO on PaymentGatewayResultDto).
    public async Task<PaymentConfirmationResult> ConfirmOnlinePaymentAsync(
        Guid paymentId,
        string holdToken,
        string? gatewayTransactionId,
        decimal clientReportedGatewayFeeAmount,
        string? gatewayResponseJson)
    {
      var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == paymentId)
          ?? throw new InvalidOperationException($"Payment {paymentId} does not exist.");

      // Retry-safety: the gateway (or our own client) re-sent a confirm call for a
      // payment that already succeeded — most likely a lost response on the first
      // attempt, a genuine gateway webhook retry, or a double-tap on the client. As long
      // as the gateway's own transaction id matches what we recorded the first time,
      // this is the SAME event arriving twice, not a new one, so we hand back the
      // already-settled result instead of throwing the "already Succeeded" error a truly
      // new/conflicting confirm attempt for this payment should still get.
      if (payment.Status == PaymentStatus.Succeeded)
      {
        // Compare against "" rather than null on both sides so two demo-mode retries
        // that both arrive with no real gatewayTransactionId still count as a match —
        // paymentId already narrows this to one specific payment attempt; this check
        // exists to catch a genuinely different completed transaction id being replayed
        // against the same payment, not to require a non-empty id in the first place.
        if (string.Equals(payment.GatewayTransactionId ?? "", gatewayTransactionId ?? "", StringComparison.Ordinal))
        {
          return await BuildIdempotentResultAsync(payment);
        }

        throw new InvalidOperationException(
            $"Payment {paymentId} is already {payment.Status}; it cannot be confirmed again.");
      }

      if (payment.Status != PaymentStatus.Initiated && payment.Status != PaymentStatus.Pending)
      {
        throw new InvalidOperationException(
            $"Payment {paymentId} is already {payment.Status}; it cannot be confirmed again.");
      }

      var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == payment.BookingId)
          ?? throw new InvalidOperationException($"Booking for payment {paymentId} no longer exists.");

      // Every booking is created from a hold — BookingsController.Create rejects a
      // booking request with no valid hold — so this is a "should never happen" defensive
      // check, not a normal business rejection. Checked before touching payment state.
      if (booking.SeatHoldId is null)
      {
        throw new InvalidOperationException($"Booking {booking.Id} has no SeatHoldId.");
      }

      // Chunk 4 P0 task 3: a client (or a compromised/misbehaving gateway callback) could
      // otherwise declare its own fee and shrink NetReceivedAmount — and, before this fix,
      // the Angular checkout literally always sent 0 here regardless of the fee it had just
      // shown the customer at the method picker (see payment.component.ts), so the ledger
      // silently recorded zero gateway cost on every online sale. The real figure is looked
      // up from the same PaymentMethodConfiguration the customer's fee estimate came from —
      // never from clientReportedGatewayFeeAmount, which is intentionally unused for the
      // ledger from here on (kept only as a signed-in parameter — see the method's own
      // comment above — for symmetry with the DTO a future real gateway would replace).
      var computedGatewayFeeAmount = await ComputeGatewayFeeAsync(payment);

      // Record the money as received first. This is the source-of-truth fact and stays
      // true even in the seat-loss branch below — the payment really did succeed; what
      // happens next is a separate question.
      await using (var tx = await _db.Database.BeginTransactionAsync())
      {
        try
        {
          payment.Status = PaymentStatus.Succeeded;
          payment.PaidAtUtc = DateTime.UtcNow;
          payment.GatewayTransactionId = gatewayTransactionId;
          payment.GatewayFeeAmount = computedGatewayFeeAmount;
          payment.NetReceivedAmount = payment.Amount - computedGatewayFeeAmount;
          payment.GatewayResponseJson = TagDemoConfirmationIfEnabled(gatewayResponseJson);
          payment.UpdatedAtUtc = DateTime.UtcNow;

          _db.PaymentHistories.Add(new PaymentHistory
          {
            PaymentId = payment.Id,
            Status = PaymentStatus.Succeeded,
            Remarks = "Gateway confirmed payment."
          });

          await _db.SaveChangesAsync();
          await tx.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
          // Someone else — almost certainly a second, concurrent delivery of this
          // exact same confirm event (two webhook retries racing, or a duplicate
          // client request) — already committed this same payment to Succeeded
          // between our read and our write. RowVersion caught it before two
          // conflicting writes could land, which is exactly what it's for; the
          // caller still needs a real answer instead of a 500 though.
          await tx.RollbackAsync();

          var reloaded = await _db.Payments.AsNoTracking()
              .FirstOrDefaultAsync(p => p.Id == paymentId)
              ?? throw new InvalidOperationException($"Payment {paymentId} does not exist.");

          if (reloaded.Status != PaymentStatus.Succeeded)
          {
            // Not the "two confirms raced" case after all — something else changed
            // this row out from under us. Don't guess at what happened; surface the
            // real conflict instead of quietly reporting a made-up outcome.
            throw;
          }

          // Detach our stale tracked copy (its RowVersion no longer matches what's on
          // disk) so nothing later in this scope accidentally tries to save it again.
          _db.Entry(payment).State = EntityState.Detached;
          return await BuildIdempotentResultAsync(reloaded);
        }
      }

      var result = new PaymentConfirmationResult { Payment = payment, Booking = booking };

      try
      {
        await _seatHoldService.ConvertHoldToBookingAsync(holdToken, booking.Id, booking.SeatHoldId.Value);
      }
      catch (InvalidOperationException ex)
      {
        // Matches the rule already documented on SeatHoldService: money in, seats gone
        // = refund case, never silently ignored. We stop here — no tickets, no ledger
        // entry — for a booking that has no real seats behind it.
        var refund = new Refund
        {
          BookingId = booking.Id,
          PaymentId = payment.Id,
          Amount = payment.Amount,
          Currency = payment.Currency,
          Status = RefundStatus.Requested,
          Reason = $"Automatic refund: seats were lost before payment confirmation completed ({ex.Message})",
          RequestedAtUtc = DateTime.UtcNow,
        };
        _db.Refunds.Add(refund);
        await _db.SaveChangesAsync();

        result.Outcome = PaymentConfirmationOutcome.PaidButSeatsLost;
        result.AutoRefund = refund;
        return result;
      }

      // Seats are confirmed as this booking's — now lock in the booking itself and issue
      // one ticket per passenger.
      result.Tickets = await ConfirmBookingAndIssueTicketsAsync(booking);
      result.Outcome = PaymentConfirmationOutcome.Confirmed;

      // Ledger posting last, isolated in its own try/catch. A missing commission-rule
      // configuration is a real problem, but it must never be the reason a customer who
      // has genuinely paid walks away without a ticket — flag it for finance to fix by
      // hand instead of blocking checkout.
      try
      {
        var (commission, gatewayFeeBearer) = await ResolveCommissionAsync(booking);
        await _financeLedgerService.PostOnlineSaleAsync(
            booking.Id,
            booking.BusOperatorId,
            payment.Amount,
            commission,
            payment.GatewayFeeAmount,
            gatewayFeeBearer,
            payment.Currency);
      }
      catch (Exception ex)
      {
        result.LedgerWarning =
            $"Ticket issued and booking confirmed, but the commission ledger entry failed: " +
            $"{ex.Message}. Needs manual reconciliation.";

        // Without this, the failure above only ever lived in the HTTP response the
        // customer's own checkout received (which never reads/shows ledgerWarning -
        // see payment.component.ts) and was gone the moment that response was sent.
        // No PaymentHistory row meant no trace anywhere: not the "Needs Reconciliation"
        // card (AdminDashboardController sums PaymentHistories WHERE Status =
        // ReconciliationNeeded), not a log, nothing - so the sale just silently never
        // counted in Online Gross with no way for anyone to find out why. Writing it
        // here is what actually surfaces it, the same way the PaidButSeatsLost branch
        // above already does for its own failure case.
        _db.PaymentHistories.Add(new PaymentHistory
        {
          PaymentId = payment.Id,
          Status = PaymentStatus.ReconciliationNeeded,
          Remarks = result.LedgerWarning
        });
        await _db.SaveChangesAsync();
      }

      return result;
    }

    // Reconstructs what ConfirmOnlinePaymentAsync already decided the first time around,
    // for a payment that's already Succeeded — used by both the plain-retry path and the
    // DbUpdateConcurrencyException race above it. Looks at what's actually on disk rather
    // than assuming "Succeeded" always means "Confirmed", since the seats-lost branch above
    // also leaves payment.Status at Succeeded.
    private async Task<PaymentConfirmationResult> BuildIdempotentResultAsync(Payment payment)
    {
      var booking = await _db.Bookings.AsNoTracking()
          .FirstOrDefaultAsync(b => b.Id == payment.BookingId);

      var tickets = await _db.Tickets.AsNoTracking()
          .Where(t => t.BookingId == payment.BookingId)
          .OrderBy(t => t.SeatNumberSnapshot)
          .ToListAsync();

      if (booking?.Status == BookingStatus.Confirmed && tickets.Count > 0)
      {
        return new PaymentConfirmationResult
        {
          Outcome = PaymentConfirmationOutcome.Confirmed,
          Payment = payment,
          Booking = booking,
          Tickets = tickets
        };
      }

      // First confirm call landed on the seats-lost branch above — surface the same
      // PaidButSeatsLost outcome again, picking up whatever auto-refund that attempt
      // already created, instead of a false "Confirmed".
      var existingRefund = await _db.Refunds.AsNoTracking()
          .Where(r => r.PaymentId == payment.Id)
          .OrderByDescending(r => r.RequestedAtUtc)
          .FirstOrDefaultAsync();

      if (existingRefund != null)
      {
        return new PaymentConfirmationResult
        {
          Outcome = PaymentConfirmationOutcome.PaidButSeatsLost,
          Payment = payment,
          Booking = booking,
          AutoRefund = existingRefund
        };
      }

      // Payment succeeded but neither a confirmed booking nor an auto-refund exists yet —
      // the first confirm call's booking/ticket half is still genuinely in flight (a
      // concurrent retry landing mid-way through). Nothing has actually gone wrong; there
      // just isn't a final outcome to report back yet, so say that plainly rather than
      // guessing at one.
      throw new InvalidOperationException(
          $"Payment {payment.Id} has succeeded and is still being finalized. Please retry shortly.");
    }

    // Piece 6: today, this endpoint just trusts whatever the caller says the gateway
    // returned — there's no real payment gateway wired in yet (see the TODO on
    // PaymentsController.Confirm and the IPaymentGatewayVerifier stub). While
    // Payments:DemoMode stays true (the default — matches today's actual behavior), that
    // trust doesn't change, but every confirmation's stored response now carries a visible
    // tag so a demo confirmation can never later be mistaken for one a real gateway
    // signature actually verified.
    private string? TagDemoConfirmationIfEnabled(string? gatewayResponseJson)
    {
      if (!_configuration.GetValue("Payments:DemoMode", true))
      {
        return gatewayResponseJson;
      }

      const string DemoTag = "[DEMO-CONFIRMATION: client-trusted, no real gateway signature verified]";

      if (string.IsNullOrEmpty(gatewayResponseJson)) return DemoTag;
      return gatewayResponseJson.Contains(DemoTag) ? gatewayResponseJson : $"{DemoTag} {gatewayResponseJson}";
    }

    // Piece 3's stuck-payment safety net. A payment that reached Status.Succeeded but whose
    // booking/tickets never got finalized — most likely the process crashed, or the DB
    // blipped, between the first transaction above (payment marked Succeeded) and the
    // second one (booking confirmed + tickets issued), with no retry ever arriving to
    // complete it. Left alone, that's money sitting in the platform's account with nothing
    // on the customer's side to show for it, and nobody looking at it. Called periodically
    // by PaymentReconciliationSweepService; returns how many payments it flagged.
    //
    // Deliberately does NOT touch payment.Status — the payment itself genuinely succeeded;
    // what's broken is what happened (or didn't) after that fact. So the flag lives on
    // PaymentHistory instead, the same append-only timeline every other payment-status
    // transition already goes through — queryable with `WHERE Status = ReconciliationNeeded`
    // — rather than misrepresenting the payment's own true status. Mirrors
    // RefundStatus.ReconciliationNeeded from RefundProcessingService.
    public async Task<int> FlagStuckPaymentsAsync(TimeSpan staleAfter)
    {
      var cutoff = DateTime.UtcNow - staleAfter;

      var candidates = await _db.Payments
          .Where(p => p.Status == PaymentStatus.Succeeded
              && p.PaidAtUtc != null
              && p.PaidAtUtc <= cutoff
              // Already has a Refund on record — the seats-lost branch above already
              // requested one. That's a known, already-handled outcome, not a silent gap.
              && !_db.Refunds.Any(r => r.PaymentId == p.Id)
              // Already flagged on an earlier sweep — don't add a new history row every
              // tick for the same still-unresolved payment.
              && !_db.PaymentHistories.Any(h =>
                  h.PaymentId == p.Id && h.Status == PaymentStatus.ReconciliationNeeded))
          .ToListAsync();

      if (candidates.Count == 0) return 0;

      var bookingIds = candidates.Select(p => p.BookingId).ToList();

      var confirmedBookingIds = (await _db.Bookings
          .Where(b => bookingIds.Contains(b.Id) && b.Status == BookingStatus.Confirmed)
          .Select(b => b.Id)
          .ToListAsync())
          .ToHashSet();

      var bookingIdsWithTickets = (await _db.Tickets
          .Where(t => bookingIds.Contains(t.BookingId))
          .Select(t => t.BookingId)
          .Distinct()
          .ToListAsync())
          .ToHashSet();

      var flaggedCount = 0;
      foreach (var payment in candidates)
      {
        var isFinalized = confirmedBookingIds.Contains(payment.BookingId)
            && bookingIdsWithTickets.Contains(payment.BookingId);
        if (isFinalized) continue;

        _db.PaymentHistories.Add(new PaymentHistory
        {
          PaymentId = payment.Id,
          Status = PaymentStatus.ReconciliationNeeded,
          Remarks = $"Payment succeeded at {payment.PaidAtUtc:u} but no confirmed " +
                      "booking/tickets were found after the reconciliation window. " +
                      "Needs manual review."
        });
        flaggedCount++;
      }

      if (flaggedCount > 0)
      {
        await _db.SaveChangesAsync();
      }

      return flaggedCount;
    }

    // Customer abandoned checkout, or the gateway reported failure — free the seats right
    // away instead of making the next customer wait out the full hold timer.
    public async Task FailPaymentAsync(Guid paymentId, string holdToken, string? reason)
    {
      var payment = await _db.Payments.FirstOrDefaultAsync(p => p.Id == paymentId)
          ?? throw new InvalidOperationException($"Payment {paymentId} does not exist.");

      if (payment.Status != PaymentStatus.Initiated && payment.Status != PaymentStatus.Pending)
      {
        throw new InvalidOperationException(
            $"Payment {paymentId} is already {payment.Status}; it cannot be failed.");
      }

      payment.Status = PaymentStatus.Failed;
      payment.FailedAtUtc = DateTime.UtcNow;
      payment.UpdatedAtUtc = DateTime.UtcNow;

      _db.PaymentHistories.Add(new PaymentHistory
      {
        PaymentId = payment.Id,
        Status = PaymentStatus.Failed,
        Remarks = reason ?? "Payment failed."
      });

      await _db.SaveChangesAsync();
      await _seatHoldService.ReleaseHoldAsync(holdToken);
    }

    // Counter-sale counterpart to InitiatePaymentAsync + ConfirmOnlinePaymentAsync,
    // collapsed into one call: cash (or a card swiped at the counter) changes hands in
    // person the moment this is submitted, so there's no gateway round trip to wait on —
    // Payment is recorded straight to Succeeded instead of Initiated. Only the two
    // downstream steps (convert hold → booking, issue tickets) are shared with the online
    // flow (see ConfirmBookingAndIssueTicketsAsync); everything about how the money itself
    // got recorded, and which side of the ledger it posts to, is different. Only reachable
    // for a Booking BookingsController.Create already created with SaleChannel.Counter /
    // MoneyCollectedBy.Operator — see the check below.
    public async Task<PaymentConfirmationResult> ConfirmCounterSaleAsync(
        Guid bookingId,
        string holdToken,
        PaymentMethod method)
    {
      var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId)
          ?? throw new InvalidOperationException($"Booking {bookingId} does not exist.");

      if (booking.SaleChannel != SaleChannel.Counter || booking.MoneyCollectedBy != MoneyCollectedBy.Operator)
      {
        throw new InvalidOperationException(
            $"Booking {bookingId} is a {booking.SaleChannel} sale, not a counter sale. " +
            "Use the online Initiate/Confirm payment flow instead.");
      }

      // Every booking is created from a hold — BookingsController.Create rejects a
      // booking request with no valid hold — so this is a "should never happen" defensive
      // check, not a normal business rejection.
      if (booking.SeatHoldId is null)
      {
        throw new InvalidOperationException($"Booking {booking.Id} has no SeatHoldId.");
      }

      // Idempotency: there's no gateway here to retry a webhook, but staff double-tapping
      // "confirm" on a counter terminal is a completely realistic failure mode — if this
      // booking already has a succeeded payment, hand back what already happened instead
      // of collecting the customer's cash twice over.
      var existingPayment = await _db.Payments
          .Where(p => p.BookingId == bookingId && p.Status == PaymentStatus.Succeeded)
          .OrderByDescending(p => p.PaidAtUtc)
          .FirstOrDefaultAsync();

      if (existingPayment != null)
      {
        return await BuildIdempotentResultAsync(existingPayment);
      }

      if (booking.Status != BookingStatus.PendingPayment && booking.Status != BookingStatus.Draft)
      {
        throw new InvalidOperationException(
            $"Booking {bookingId} is {booking.Status} and can no longer accept payment.");
      }

      var payment = new Payment
      {
        BookingId = booking.Id,
        Method = method,
        Gateway = PaymentGateway.None,
        CollectedBy = MoneyCollectedBy.Operator,
        Amount = booking.GrandTotal,
        // Cash in hand at a counter has no gateway fee to deduct.
        NetReceivedAmount = booking.GrandTotal,
        Currency = booking.Currency,
        Status = PaymentStatus.Succeeded,
        TransactionDateUtc = DateTime.UtcNow,
        PaidAtUtc = DateTime.UtcNow,
      };

      _db.Payments.Add(payment);
      _db.PaymentHistories.Add(new PaymentHistory
      {
        PaymentId = payment.Id,
        Status = PaymentStatus.Succeeded,
        Remarks = $"Collected in person at the counter ({method})."
      });
      await _db.SaveChangesAsync();

      var result = new PaymentConfirmationResult { Payment = payment, Booking = booking };

      try
      {
        await _seatHoldService.ConvertHoldToBookingAsync(holdToken, booking.Id, booking.SeatHoldId.Value);
      }
      catch (InvalidOperationException ex)
      {
        // Unlike the online flow, the platform never held this money — the counter
        // already has the cash (or card payment) in hand. There's nothing on OUR side to
        // refund, so no Refund row is raised here; flag it on the payment's own history
        // instead so it's queryable, and leave getting the customer's money back to the
        // counter that collected it.
        _db.PaymentHistories.Add(new PaymentHistory
        {
          PaymentId = payment.Id,
          Status = PaymentStatus.ReconciliationNeeded,
          Remarks = $"Seats were lost before this counter sale could be finalized ({ex.Message}). " +
                      "Payment was already collected at the counter — refund the customer directly there."
        });
        await _db.SaveChangesAsync();

        result.Outcome = PaymentConfirmationOutcome.PaidButSeatsLost;
        return result;
      }

      result.Tickets = await ConfirmBookingAndIssueTicketsAsync(booking);
      result.Outcome = PaymentConfirmationOutcome.Confirmed;

      // Ledger posting last, isolated in its own try/catch — same reasoning as the online
      // flow: a missing CommissionRule must never be the reason a walk-in customer who's
      // already paid at the counter leaves without a ticket.
      try
      {
        var commissionRule = await ResolveCommissionRuleAsync(booking, SaleChannel.Counter);
        var commission = ComputeCommission(commissionRule, booking.GrandTotal);
        await _financeLedgerService.PostCounterSaleCommissionAsync(
            booking.Id, booking.BusOperatorId, commission, booking.Currency);
      }
      catch (Exception ex)
      {
        result.LedgerWarning =
            $"Ticket issued and booking confirmed, but the counter-sale commission ledger entry failed: " +
            $"{ex.Message}. Needs manual reconciliation.";

        // Same gap as the online flow's identical catch block above: without a
        // PaymentHistory row here, this failure never reaches the "Needs
        // Reconciliation" card or anywhere else an admin could find it.
        _db.PaymentHistories.Add(new PaymentHistory
        {
          PaymentId = payment.Id,
          Status = PaymentStatus.ReconciliationNeeded,
          Remarks = result.LedgerWarning
        });
        await _db.SaveChangesAsync();
      }

      return result;
    }

    // Shared by both the online and counter-sale confirmation paths: locks in the booking
    // itself and issues one ticket per passenger, once SeatHoldService has confirmed every
    // seat in the hold really did convert to this booking. Kept as one method so the
    // passenger/seat pairing rule (see the comment inside) can never drift between the two
    // channels.
    private async Task<List<Ticket>> ConfirmBookingAndIssueTicketsAsync(Booking booking)
    {
      await using var tx = await _db.Database.BeginTransactionAsync();

      booking.Confirm(); // Booking's own method — throws if it's not in a confirmable state.

      // BookingPassenger and TripSeat don't have a direct FK to each other in this
      // schema (BookingCreateDto doesn't collect a per-passenger seat choice either), so
      // passengers are paired to this booking's now-Booked seats in a fixed, deterministic
      // order. Fine for the current demo-level checkout; a real "passenger picks seat X"
      // flow would need an explicit link instead.
      var passengers = await _db.BookingPassengers
          .Where(p => p.BookingId == booking.Id)
          .OrderBy(p => p.CreatedAtUtc)
          .ToListAsync();

      var bookedSeats = await _db.TripSeats
          .Where(ts => ts.BookingId == booking.Id)
          .OrderBy(ts => ts.SeatNumber)
          .ToListAsync();

      if (passengers.Count != bookedSeats.Count)
      {
        throw new InvalidOperationException(
            $"Booking {booking.Id} has {passengers.Count} passenger(s) but {bookedSeats.Count} " +
            "booked seat(s) — cannot safely pair them into tickets.");
      }

      var tickets = new List<Ticket>();
      for (int i = 0; i < passengers.Count; i++)
      {
        var seat = bookedSeats[i];
        tickets.Add(new Ticket
        {
          BookingId = booking.Id,
          BookingPassengerId = passengers[i].Id,
          TripId = booking.TripId,
          TripSeatId = seat.Id,
          TicketNumber = GenerateTicketNumber(),
          SeatNumberSnapshot = seat.SeatNumber,
          QrCodePayload = $"{booking.Pnr}|{seat.SeatNumber}|{Guid.NewGuid():N}",
          Fare = seat.Fare,
          DiscountAmount = 0m,
          FinalFare = seat.Fare,
          Status = TicketStatus.Issued,
          IssuedAtUtc = DateTime.UtcNow,
        });
      }

      _db.Tickets.AddRange(tickets);
      await _db.SaveChangesAsync();
      await tx.CommitAsync();

      return tickets;
    }

    // Finds the operator's active commission rule for the given channel (preferring one
    // scoped to this trip's specific route over a general one). Throws if nothing is
    // configured — see the try/catch around each caller for why that's safe to do this late
    // in the flow.
    private async Task<CommissionRule> ResolveCommissionRuleAsync(Booking booking, SaleChannel channel)
    {
      var today = DateOnly.FromDateTime(DateTime.UtcNow);

      var busRouteId = await _db.Trips
          .Where(t => t.Id == booking.TripId)
          .Select(t => t.BusRouteId)
          .FirstOrDefaultAsync();

      var candidates = await _db.CommissionRules
          .Where(cr => cr.BusOperatorId == booking.BusOperatorId
              && cr.SaleChannel == channel
              && cr.IsActive
              && cr.EffectiveFrom <= today
              && (cr.EffectiveTo == null || cr.EffectiveTo >= today))
          .ToListAsync();

      return candidates.FirstOrDefault(cr => cr.BusRouteId == busRouteId)
          ?? candidates.FirstOrDefault(cr => cr.BusRouteId == null)
          ?? throw new InvalidOperationException(
              $"No active {channel} CommissionRule configured for operator {booking.BusOperatorId}.");
    }

    private static decimal ComputeCommission(CommissionRule rule, decimal grandTotal) => rule.CommissionType switch
    {
      CommissionType.Percentage => Math.Round(grandTotal * (rule.CommissionValue / 100m), 2),
      CommissionType.FixedAmount => rule.CommissionValue,
      _ => 0m
    };

    // Finds the operator's active online-sale commission rule and their contract's
    // gateway-fee-bearer setting. Throws if no commission rule is configured — see the
    // try/catch around the caller for why that's safe to do this late in the flow.
    private async Task<(decimal commission, GatewayFeeBearer feeBearer)> ResolveCommissionAsync(Booking booking)
    {
      var rule = await ResolveCommissionRuleAsync(booking, SaleChannel.Online);
      var commission = ComputeCommission(rule, booking.GrandTotal);

      var feeBearer = await _db.OperatorContracts
          .Where(c => c.BusOperatorId == booking.BusOperatorId && c.IsActive)
          .Select(c => (GatewayFeeBearer?)c.GatewayFeeBearer)
          .FirstOrDefaultAsync() ?? GatewayFeeBearer.Platform;

      return (commission, feeBearer);
    }

    // Chunk 4 P0 task 3: the server-side source of truth for what a gateway/method actually
    // costs, looked up from the exact same PaymentMethodConfiguration row
    // PaymentsController.GetPaymentMethods used to show the customer their fee estimate at
    // checkout — so the ledger entry always matches what was quoted, and a client can never
    // just declare its own (e.g. zero) fee. Cash/no-provider payments have no gateway fee;
    // an unconfigured method also costs nothing rather than throwing, since a missing fee
    // row is a pricing gap for Finance to fill in, not a reason to block a paying customer's
    // ticket (same "never block checkout on a config gap" reasoning as the commission-rule
    // try/catch around this method's caller).
    private async Task<decimal> ComputeGatewayFeeAsync(Payment payment)
    {
      if (payment.PaymentProviderId is null)
      {
        return 0m;
      }

      var config = await _db.PaymentMethodConfigurations
          .AsNoTracking()
          .FirstOrDefaultAsync(c =>
              c.PaymentProviderId == payment.PaymentProviderId.Value &&
              c.Method == payment.Method);

      if (config is null)
      {
        return 0m;
      }

      var fixedFee = config.FixedFee ?? 0m;
      var percentageFee = config.PercentageFee ?? 0m;

      return Math.Round(fixedFee + payment.Amount * (percentageFee / 100m), 2);
    }

    private static string GenerateTicketNumber() =>
        "TKT" + Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();
  }
}

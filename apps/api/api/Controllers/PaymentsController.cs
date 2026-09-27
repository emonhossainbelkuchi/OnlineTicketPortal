using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
  // Access is three-tiered, same pattern as RefundsController (Payment doesn't carry
  // BusOperatorId either, so scoping always joins through Booking.BusOperatorId): platform
  // Admin/Staff see every payment; an operator's own Staff/Operator account only sees
  // payments against that operator's own bookings; a plain Customer only sees their own.
  [Authorize]
  [Route("api/[controller]")]
  [ApiController]
  public class PaymentsController(
      AppDbContext db,
      PaymentConfirmationService paymentConfirmationService,
      ICurrentActorService currentActor
  ) : ControllerBase
  {
    // =========================================================
    // GET: /api/payments
    // List payments (scoped by role)
    // =========================================================
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
      var query = db.Payments.AsQueryable();

      if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
      {
        var callerOperatorId = await User.GetBusOperatorIdAsync(db);
        if (callerOperatorId != null)
        {
          query = query.Where(p => db.Bookings.Any(b =>
              b.Id == p.BookingId && b.BusOperatorId == callerOperatorId));
        }
        // else: platform Admin/Staff — no filter, see everything.
      }
      else
      {
        var userId = GetCurrentUserId();
        query = query.Where(p => db.Bookings.Any(b =>
            b.Id == p.BookingId &&
            b.CustomerProfile != null &&
            b.CustomerProfile.UserId == userId));
      }

      var items = await query
          .OrderByDescending(p => p.TransactionDateUtc)
          .ToListAsync();

      return Ok(items.Select(ToResponseDto));
    }

    // =========================================================
    // ⭐ GET: /api/payments/methods
    // Customer-facing list of ACTIVE payment providers
    // that a logged-in customer can pick during checkout.
    //
    // NOT admin-gated — anyone authenticated (with a booking
    // in progress) needs to see this list.
    //
    // Only non-sensitive fields returned (no webhook URLs,
    // no gateway secrets).
    //
    // IMPORTANT: this route MUST come BEFORE "{id}" so the
    // "methods" path segment isn't parsed as a Guid id.
    // =========================================================
    [HttpGet("methods")]
    public async Task<IActionResult> GetPaymentMethods()
    {
      // Checkout must receive enabled *method configurations*, not merely the provider
      // records. One provider can expose several methods with different fees (for example,
      // card and online-gateway through SSLCommerz), and a provider without an enabled
      // configuration is not a valid checkout choice.
      var methods = await db.PaymentMethodConfigurations
          .AsNoTracking()
          .Where(c => c.IsActive &&
                      c.Method != PaymentMethod.Cash &&
                      c.PaymentProvider.IsActive)
          .OrderBy(c => c.PaymentProvider.Name)
          .ThenBy(c => c.DisplayName)
          .Select(c => new
          {
            providerId = c.PaymentProviderId,
            providerName = c.PaymentProvider.Name,
            providerCode = c.PaymentProvider.Code,
            method = c.Method,
            displayName = c.DisplayName,
            fixedFee = c.FixedFee,
            percentageFee = c.PercentageFee,
            gateway = c.PaymentProvider.Gateway,
            supportsRefund = c.PaymentProvider.SupportsRefund
          })
          .ToListAsync();

      return Ok(methods);
    }

    // =========================================================
    // GET: /api/payments/{id}
    // =========================================================
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
      var item = await db.Payments.FirstOrDefaultAsync(x => x.Id == id);
      if (item == null) return NotFound();
      if (!await CanAccessAsync(item)) return Forbid();
      return Ok(ToResponseDto(item));
    }

    // =========================================================
    // POST: /api/payments/initiate
    // Step 3 of checkout: start a payment attempt.
    // Amount always comes from the booking's own GrandTotal
    // computed server-side inside PaymentConfirmationService.
    // =========================================================
    [HttpPost("initiate")]
    public async Task<IActionResult> Initiate(PaymentInitiateDto dto)
    {
      try
      {
        var payment = await paymentConfirmationService.InitiatePaymentAsync(
            dto.BookingId,
            dto.HoldToken,
            dto.Method,
            dto.PaymentProviderId);

        return CreatedAtAction(
            nameof(GetById),
            new { id = payment.Id },
            ToResponseDto(payment));
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // =========================================================
    // POST: /api/payments/{id}/confirm
    // Step 4: gateway reports success. Converts seat hold to
    // booking, issues tickets, posts sale to commission ledger.
    // =========================================================
    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id, PaymentGatewayResultDto dto)
    {
      var payment = await db.Payments.FirstOrDefaultAsync(x => x.Id == id);
      if (payment == null) return NotFound();
      if (!await CanAccessAsync(payment)) return Forbid();

      try
      {
        var result = await paymentConfirmationService.ConfirmOnlinePaymentAsync(
            id,
            dto.HoldToken,
            dto.GatewayTransactionId,
            dto.GatewayFeeAmount,
            dto.GatewayResponseJson);

        if (result.Outcome == PaymentConfirmationOutcome.PaidButSeatsLost)
        {
          return Conflict(new
          {
            message = "Payment was received, but the held seats are no longer available. " +
                        "A refund has automatically been requested.",
            refundId = result.AutoRefund?.Id
          });
        }

        return Ok(new
        {
          payment = ToResponseDto(result.Payment),
          bookingStatus = result.Booking?.Status,
          ticketIds = result.Tickets.Select(t => t.Id),
          ledgerWarning = result.LedgerWarning
        });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // =========================================================
    // POST: /api/payments/{id}/fail
    // =========================================================
    [HttpPost("{id:guid}/fail")]
    public async Task<IActionResult> Fail(Guid id, PaymentFailDto dto)
    {
      var payment = await db.Payments.FirstOrDefaultAsync(x => x.Id == id);
      if (payment == null) return NotFound();
      if (!await CanAccessAsync(payment)) return Forbid();

      try
      {
        await paymentConfirmationService.FailPaymentAsync(
            id, dto.HoldToken, dto.Reason);
        return NoContent();
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // =========================================================
    // POST: /api/payments/counter-sale/confirm
    // =========================================================
    //
    // RBAC Amendment v3, Chunk 6 note: "make ... the walk-in workflow use Counter.Read/
    // Counter.Sell and the assigned-counter relation. Do not use only BusOperatorId as its
    // authorization test." This confirm step is the last leg of that same walk-in workflow —
    // BookingsController.Create already enforces Counter.Sell + CanUseCounter against
    // dto.SalesCounterId when the booking is first created (see its own comment), but this
    // endpoint still only checked CanManageOperatorAsync (operator-level). That gap meant a
    // CounterStaff clerk assigned to counter A could still confirm cash for a booking created
    // (by anyone) against counter B of the same operator — collecting/recording a "sale" for
    // a desk they were never assigned to. Same permission + scope pair as the create step,
    // now checked again here against the booking's own SalesCounterId.
    [HttpPost("counter-sale/confirm")]
    public async Task<IActionResult> ConfirmCounterSale(CounterSaleConfirmDto dto)
    {
      var actor = await currentActor.ResolveAsync(User);
      if (!actor.HasPermission(Permissions.CounterSell)) return Forbid();

      var booking = await db.Bookings
          .FirstOrDefaultAsync(b => b.Id == dto.BookingId);
      if (booking == null)
        return NotFound(new { message = "Booking not found." });

      if (booking.SalesCounterId == null)
      {
        return BadRequest(new { message = "This booking was not made at a sales counter." });
      }

      if (!actor.CanUseCounter(booking.SalesCounterId.Value, booking.BusOperatorId))
      {
        return Forbid();
      }

      try
      {
        var result = await paymentConfirmationService.ConfirmCounterSaleAsync(
            dto.BookingId, dto.HoldToken, dto.Method);

        if (result.Outcome == PaymentConfirmationOutcome.PaidButSeatsLost)
        {
          return Conflict(new
          {
            message = "Payment was collected, but the held seats are no longer available. " +
                        "The platform never held this money — refund the customer directly at the counter."
          });
        }

        return Ok(new
        {
          payment = ToResponseDto(result.Payment),
          bookingStatus = result.Booking?.Status,
          ticketIds = result.Tickets.Select(t => t.Id),
          ledgerWarning = result.LedgerWarning
        });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // =========================================================
    // Helpers
    // =========================================================
    private Guid? GetCurrentUserId()
    {
      var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
      return Guid.TryParse(claim, out var id) ? id : null;
    }

    private async Task<bool> CanAccessAsync(Payment payment)
    {
      if (User.IsInRole("Admin") ||
          User.IsInRole("Staff") ||
          User.IsInRole("Operator"))
      {
        var operatorId = await db.Bookings
            .Where(b => b.Id == payment.BookingId)
            .Select(b => (Guid?)b.BusOperatorId)
            .FirstOrDefaultAsync();

        return operatorId != null &&
               await User.CanManageOperatorAsync(db, operatorId.Value);
      }

      var userId = GetCurrentUserId();
      if (userId == null) return false;

      return await db.Bookings.AnyAsync(b =>
          b.Id == payment.BookingId &&
          b.CustomerProfile != null &&
          b.CustomerProfile.UserId == userId);
    }

    private static PaymentResponseDto ToResponseDto(Payment x) => new()
    {
      Id = x.Id,
      BookingId = x.BookingId,
      PaymentProviderId = x.PaymentProviderId,
      Method = x.Method,
      Gateway = x.Gateway,
      CollectedBy = x.CollectedBy,
      GatewayTransactionId = x.GatewayTransactionId,
      MerchantInvoiceNumber = x.MerchantInvoiceNumber,
      Amount = x.Amount,
      GatewayFeeAmount = x.GatewayFeeAmount,
      NetReceivedAmount = x.NetReceivedAmount,
      Currency = x.Currency,
      Status = x.Status,
      TransactionDateUtc = x.TransactionDateUtc,
      PaidAtUtc = x.PaidAtUtc,
      FailedAtUtc = x.FailedAtUtc,
      GatewayResponseJson = x.GatewayResponseJson,
      CreatedAtUtc = x.CreatedAtUtc,
      UpdatedAtUtc = x.UpdatedAtUtc,
      RowVersion = x.RowVersion,
    };
  }
}

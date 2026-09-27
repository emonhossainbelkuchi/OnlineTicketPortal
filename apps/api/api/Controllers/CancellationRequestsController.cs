using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
  // Cancellations only ever move through CancellationProcessingService from here:
  // Create -> RequestAsync (prices the refund from the trip's real CancellationPolicy),
  // Approve/Reject are staff-only, and Complete closes the loop once the linked Refund has
  // actually succeeded through RefundsController. The old generic CRUD let a customer submit
  // a cancellation and approve their own refund amount in the same request.
  //
  // Access is three-tiered, same pattern as RefundsController (CancellationRequest doesn't
  // carry BusOperatorId either, so scoping always joins through Booking.BusOperatorId):
  // platform Admin/Staff see every request; an operator's own Staff/Operator account only
  // sees/manages requests against that operator's own bookings; a plain Customer only sees
  // their own. Previously every check here stopped at IsInRole("Staff") — no
  // GetBusOperatorIdAsync/CanManageOperatorAsync call at all — so any Staff account,
  // including one scoped to a single operator, could see and Approve/Reject/Complete every
  // other operator's cancellation requests (and set an arbitrary refund amount while doing
  // it). It also silently locked out the "Operator" login role, since that wasn't checked
  // for at all. Fixed below using the shared ClaimsPrincipalExtensions helpers.
  [Authorize]
  [Route("api/[controller]")]
  [ApiController]
  public class CancellationRequestsController(
      AppDbContext db, CancellationProcessingService cancellationProcessingService) : ControllerBase
  {
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
      var query = db.CancellationRequests.AsQueryable();

      if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
      {
        var callerOperatorId = await User.GetBusOperatorIdAsync(db);
        if (callerOperatorId != null)
        {
          query = query.Where(cr => db.Bookings.Any(b =>
              b.Id == cr.BookingId && b.BusOperatorId == callerOperatorId));
        }
        // else: platform Admin/Staff — no filter, see everything.
      }
      else
      {
        var userId = GetCurrentUserId();
        query = query.Where(cr => db.Bookings.Any(b =>
            b.Id == cr.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId));
      }

      var items = await query.OrderByDescending(cr => cr.RequestedAtUtc).ToListAsync();

      // One extra query for the whole list rather than one per row (see ToResponseDto's
      // own comment for why RefundId/RefundStatus are worth surfacing at all).
      var ids = items.Select(x => x.Id).ToList();
      var refundsByRequest = await db.Refunds
          .Where(r => r.CancellationRequestId != null && ids.Contains(r.CancellationRequestId.Value))
          .ToDictionaryAsync(r => r.CancellationRequestId!.Value, r => r);

      return Ok(items.Select(x =>
          ToResponseDto(x, refundsByRequest.GetValueOrDefault(x.Id))));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
      var item = await db.CancellationRequests.FirstOrDefaultAsync(x => x.Id == id);
      if (item == null) return NotFound();
      if (!await CanAccessAsync(item)) return Forbid();
      return Ok(ToResponseDto(item, await GetLinkedRefundAsync(id)));
    }

    // Customer-initiated (or staff, on the customer's behalf). RequestedByUserId always
    // comes from the caller's own claim, never the request body.
    [HttpPost]
    public async Task<IActionResult> Create(CancellationRequestCreateDto dto)
    {
      if (User.IsInRole("Admin"))
      {
        // No restriction.
      }
      else if (User.IsInRole("Staff") || User.IsInRole("Operator"))
      {
        // Platform Staff/Operator (BusOperatorId == null): any booking. Scoped to one
        // operator: only that operator's own bookings.
        var operatorId = await GetOperatorIdAsync(dto.BookingId);
        if (operatorId == null || !await User.CanManageOperatorAsync(db, operatorId.Value))
        {
          return Forbid();
        }
      }
      else
      {
        var userId = GetCurrentUserId();
        var ownsBooking = await db.Bookings.AnyAsync(b =>
            b.Id == dto.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId);
        if (!ownsBooking) return Forbid();
      }

      try
      {
        var item = await cancellationProcessingService.RequestAsync(
            dto.BookingId, dto.TicketId, GetCurrentUserId(), dto.Reason);

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
      }
      catch (CancellationConflictException ex)
      {
        return Conflict(new { message = ex.Message });
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // Staff review gate — Requested -> Approved. Creates the linked Refund (at Requested);
    // that Refund only moves forward from RefundsController's own Approve/Process actions.
    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationApproveDto dto)
    {
      if (!await CanManageAsync(id)) return Forbid();

      try
      {
        await cancellationProcessingService.ApproveAsync(
            id, GetCurrentUserId(), dto.ApprovedRefundAmount, dto.Remarks);

        var item = await db.CancellationRequests.FirstOrDefaultAsync(x => x.Id == id);
        return Ok(ToResponseDto(item!, await GetLinkedRefundAsync(id)));
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationRejectDto dto)
    {
      if (!await CanManageAsync(id)) return Forbid();

      try
      {
        await cancellationProcessingService.RejectAsync(id, dto.RejectedReason);
        return NoContent();
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // Closing step — only succeeds once the linked Refund has actually reached Succeeded
    // through RefundsController's own Approve/Process actions.
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
      if (!await CanManageAsync(id)) return Forbid();

      try
      {
        await cancellationProcessingService.CompleteAsync(id);
        var item = await db.CancellationRequests.FirstOrDefaultAsync(x => x.Id == id);
        return Ok(ToResponseDto(item!, await GetLinkedRefundAsync(id)));
      }
      catch (InvalidOperationException ex)
      {
        return BadRequest(new { message = ex.Message });
      }
    }

    // No generic PUT/DELETE on purpose — see the class comment above.

    private Guid? GetCurrentUserId()
    {
      var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
      return Guid.TryParse(claim, out var id) ? id : null;
    }

    // CancellationRequest doesn't carry BusOperatorId itself — resolves it via the parent
    // Booking, same as RefundsController does for Refund.
    private async Task<Guid?> GetOperatorIdAsync(Guid bookingId)
    {
      return await db.Bookings
          .Where(b => b.Id == bookingId)
          .Select(b => (Guid?)b.BusOperatorId)
          .FirstOrDefaultAsync();
    }

    private async Task<Models.Payments.Refund?> GetLinkedRefundAsync(Guid cancellationRequestId)
    {
      return await db.Refunds.FirstOrDefaultAsync(r => r.CancellationRequestId == cancellationRequestId);
    }

    // Read access (GetById): Admin/platform-Staff see everything, an operator's own
    // Staff/Operator sees only that operator's requests, a Customer sees only their own.
    private async Task<bool> CanAccessAsync(CancellationRequest item)
    {
      if (User.IsInRole("Admin") || User.IsInRole("Staff") || User.IsInRole("Operator"))
      {
        var operatorId = await GetOperatorIdAsync(item.BookingId);
        return operatorId != null && await User.CanManageOperatorAsync(db, operatorId.Value);
      }

      var userId = GetCurrentUserId();
      if (userId == null) return false;

      return await db.Bookings.AnyAsync(b =>
          b.Id == item.BookingId && b.CustomerProfile != null && b.CustomerProfile.UserId == userId);
    }

    // Write access (Approve/Reject/Complete) — staff-only regardless of whose request it
    // is; resolves the request's Booking.BusOperatorId, then defers to the same shared
    // CanManageOperatorAsync used everywhere else.
    private async Task<bool> CanManageAsync(Guid cancellationRequestId)
    {
      var bookingId = await db.CancellationRequests
          .Where(cr => cr.Id == cancellationRequestId)
          .Select(cr => (Guid?)cr.BookingId)
          .FirstOrDefaultAsync();
      if (bookingId == null) return false;

      var operatorId = await GetOperatorIdAsync(bookingId.Value);
      return operatorId != null && await User.CanManageOperatorAsync(db, operatorId.Value);
    }

    private static CancellationRequestResponseDto ToResponseDto(CancellationRequest x, Models.Payments.Refund? refund = null) => new()
    {
      Id = x.Id,
      BookingId = x.BookingId,
      TicketId = x.TicketId,
      RequestedByUserId = x.RequestedByUserId,
      ApprovedByUserId = x.ApprovedByUserId,
      Status = x.Status,
      Reason = x.Reason,
      RejectedReason = x.RejectedReason,
      BaseAmount = x.BaseAmount,
      BookingGrandTotalAtRequest = x.BookingGrandTotalAtRequest,
      AppliedRefundPercentage = x.AppliedRefundPercentage,
      AppliedFixedCancellationFee = x.AppliedFixedCancellationFee,
      RequestedRefundAmount = x.RequestedRefundAmount,
      ApprovedRefundAmount = x.ApprovedRefundAmount,
      RequestedAtUtc = x.RequestedAtUtc,
      ApprovedAtUtc = x.ApprovedAtUtc,
      CompletedAtUtc = x.CompletedAtUtc,
      CreatedAtUtc = x.CreatedAtUtc,
      UpdatedAtUtc = x.UpdatedAtUtc,
      RowVersion = x.RowVersion,
      RefundId = refund?.Id,
      RefundStatus = refund?.Status.ToString(),
    };
  }
}

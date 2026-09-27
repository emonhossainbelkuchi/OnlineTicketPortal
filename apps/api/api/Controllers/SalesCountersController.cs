// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier. SalesCounter has
// its own BusOperatorId, same shape as OperatorBranchesController — see that controller's header
// comment for the Admin/Staff/Operator role-gate note. One extra check here: OperatorBranchId is
// optional but, when set, must belong to the SAME operator as the counter itself — otherwise a
// counter could point at another operator's branch, which makes no sense and isn't caught by any
// FK constraint (OperatorBranch and SalesCounter don't share a composite key).
//
// RBAC Amendment v3: reads require Counter.Read; creating/editing/deleting a counter
// (configuration, not selling from it) requires Counter.Configure. A CounterStaff member has
// Read + Sell + Cancel but NOT Configure — this is what stops a counter clerk from renaming
// their own counter or standing up a new one (see PermissionMatrix.OperatorScope).

using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.People;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SalesCountersController(AppDbContext db, ICurrentActorService currentActor) : ControllerBase
    {
        // Chunk 6 task 1 — the counter desk's default landing screen. One scoped aggregate
        // instead of the Angular dashboard downloading full booking/cancellation/complaint
        // lists and counting client-side (see COUNTER_SALE_DEMO_SCRIPT.md).
        //
        // RBAC Amendment v3, Chunk 6 note: scoped by Counter.Read + the assigned-counter
        // relation — never by BusOperatorId alone. A CounterStaff member sees only the
        // counter(s) they actually hold an active StaffSalesCounterAssignment for (same rule
        // as CurrentActor.CanUseCounter); an Operator Manager/BusOwner sees every counter of
        // their own operator; platform Staff/Admin see every counter platform-wide, same
        // "BusOperatorId == null => unscoped" convention as GetAll below.
        //
        // "date" is a plain yyyy-MM-dd calendar day in Bangladesh local time (Asia/Dhaka,
        // UTC+6), not a UTC day — a sale at 00:30 Dhaka time must count on the day the clerk
        // is actually closing out, not roll into "yesterday" because the server stores UTC.
        // Uses Chunk 3's DhakaClock (Services/DhakaClock.cs) — the same conversion
        // TripsController.Search/BookingBusesController.GetAll use — rather than a second,
        // locally-grown copy of the same fixed-UTC+6 logic.
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] DateOnly? date)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CounterRead)) return Forbid();

            // Dhaka has been a fixed UTC+6 offset with no DST since 2009 (see DhakaClock's own
            // comment), so shifting DateTime.UtcNow by 6 hours before taking its date is exactly
            // right for "what day is it in Dhaka right now" — no separate zone lookup needed
            // just to answer that when no explicit date was given.
            var day = date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));
            var (windowStartUtc, windowEndUtc) = DhakaClock.DayRangeUtc(day);

            var counterQuery = db.SalesCounters.Where(c => c.IsActive).AsQueryable();
            if (actor.BusOperatorId != null)
            {
                counterQuery = counterQuery.Where(c => c.BusOperatorId == actor.BusOperatorId);
            }
            if (actor.JobRole == StaffRole.CounterStaff)
            {
                counterQuery = counterQuery.Where(c => actor.AssignedCounterIds.Contains(c.Id));
            }

            var counters = await counterQuery
                .Select(c => new { c.Id, c.CounterName, c.CounterCode, c.BusOperatorId })
                .ToListAsync();
            var counterIds = counters.Select(c => c.Id).ToList();

            // A booking only counts as "sold today" once its cash has actually been
            // confirmed (ConfirmedAtUtc — the same moment
            // PaymentConfirmationService.ConfirmCounterSaleAsync issues the tickets); a
            // booking still sitting in PendingPayment hasn't collected any cash yet. A fully
            // Cancelled or Refunded booking no longer represents real revenue for the day.
            var soldToday = counterIds.Count == 0
                ? new List<CounterSaleRow>()
                : await db.Bookings
                    .Where(b =>
                        b.SalesCounterId != null &&
                        counterIds.Contains(b.SalesCounterId.Value) &&
                        b.SaleChannel == SaleChannel.Counter &&
                        b.ConfirmedAtUtc != null &&
                        b.ConfirmedAtUtc >= windowStartUtc && b.ConfirmedAtUtc < windowEndUtc &&
                        (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Completed ||
                         b.Status == BookingStatus.PartiallyCancelled))
                    .Select(b => new CounterSaleRow
                    {
                        SalesCounterId = b.SalesCounterId!.Value,
                        GrandTotal = b.GrandTotal,
                        TicketCount = b.Tickets.Count(t => t.Status != TicketStatus.Cancelled),
                    })
                    .ToListAsync();

            var perCounter = counters.Select(c =>
            {
                var forThisCounter = soldToday.Where(b => b.SalesCounterId == c.Id).ToList();
                return new CounterDashboardCounterSummaryDto
                {
                    CounterId = c.Id,
                    CounterName = c.CounterName,
                    CounterCode = c.CounterCode,
                    TicketsSoldToday = forThisCounter.Sum(b => b.TicketCount),
                    CashSalesTotal = forThisCounter.Sum(b => b.GrandTotal),
                };
            }).ToList();

            // CancellationRequest and Complaint carry no SalesCounterId of their own, so
            // these two counts are scoped per-operator (the operator(s) the visible counters
            // above belong to), not per-counter.
            int pendingCancellations;
            int openComplaints;
            if (actor.BusOperatorId != null)
            {
                var operatorIds = counters.Select(c => c.BusOperatorId).Distinct().ToList();

                pendingCancellations = await db.CancellationRequests.CountAsync(r =>
                    r.Status == CancellationRequestStatus.Requested &&
                    db.Bookings.Any(b => b.Id == r.BookingId && operatorIds.Contains(b.BusOperatorId)));

                // Complaint has no BusOperatorId/SalesCounterId at all — only a nullable
                // BookingId (see ComplaintsController's own acknowledged scoping gap). A
                // complaint that isn't tied to any booking simply has no operator to scope
                // it to, so it's excluded here: undercounting is the safe direction — this
                // must never leak another operator's total onto this one's desk.
                openComplaints = await db.Complaints.CountAsync(c =>
                    (c.Status == ComplaintStatus.Open || c.Status == ComplaintStatus.InProgress) &&
                    c.BookingId != null &&
                    db.Bookings.Any(b => b.Id == c.BookingId && operatorIds.Contains(b.BusOperatorId)));
            }
            else
            {
                // Platform-wide Staff/Admin — no restriction, same convention as every other
                // list endpoint here ("null BusOperatorId == unscoped").
                pendingCancellations = await db.CancellationRequests.CountAsync(r => r.Status == CancellationRequestStatus.Requested);
                openComplaints = await db.Complaints.CountAsync(c => c.Status == ComplaintStatus.Open || c.Status == ComplaintStatus.InProgress);
            }

            return Ok(new CounterDashboardResponseDto
            {
                Date = day,
                TicketsSoldToday = perCounter.Sum(c => c.TicketsSoldToday),
                CashSalesTotal = perCounter.Sum(c => c.CashSalesTotal),
                Currency = "BDT",
                PendingCancellations = pendingCancellations,
                OpenComplaints = openComplaints,
                Counters = perCounter,
            });
        }

        // Small EF-projectable row shape for the query above — kept private, not a public
        // DTO, since it never leaves this method.
        private sealed class CounterSaleRow
        {
            public Guid SalesCounterId { get; set; }
            public decimal GrandTotal { get; set; }
            public int TicketCount { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CounterRead))
            {
                return Ok(Array.Empty<SalesCounterResponseDto>());
            }

            var query = db.SalesCounters.AsQueryable();
            if (actor.BusOperatorId != null)
            {
                query = query.Where(x => x.BusOperatorId == actor.BusOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CounterRead)) return Forbid();

            var item = await db.SalesCounters.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (!actor.CanManageOperator(item.BusOperatorId)) return Forbid();

            return Ok(ToResponseDto(item));
        }

        // Validates that dto.OperatorBranchId (if present) is a real branch belonging to
        // targetOperatorId. Returns an error result to short-circuit on, or null if everything's
        // fine (no branch given, or the given branch checks out).
        private async Task<IActionResult?> ValidateBranchAsync(Guid? operatorBranchId, Guid targetOperatorId)
        {
            if (operatorBranchId == null) return null;

            var branchOperatorId = await db.OperatorBranches
                .Where(b => b.Id == operatorBranchId)
                .Select(b => (Guid?)b.BusOperatorId)
                .FirstOrDefaultAsync();

            if (branchOperatorId == null)
            {
                return BadRequest(new { message = "OperatorBranchId does not match a real OperatorBranch." });
            }
            if (branchOperatorId != targetOperatorId)
            {
                return BadRequest(new { message = "That OperatorBranch belongs to a different operator." });
            }
            return null;
        }

        [HttpPost]
        public async Task<IActionResult> Create(SalesCounterCreateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CounterConfigure)) return Forbid();

            // Scoped (operator's own staff): the counter always belongs to THEIR operator —
            // whatever the client sent in BusOperatorId is ignored outright.
            Guid targetOperatorId;
            if (actor.BusOperatorId != null)
            {
                targetOperatorId = actor.BusOperatorId.Value;
            }
            else
            {
                if (!await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                targetOperatorId = dto.BusOperatorId;
            }

            // Chunk 8 task 6: an API-connected operator (concept doc §3.2 — "TicketPortal has no
            // involvement in their cash-counter sales") never gets a counter at all, whichever
            // branch above resolved targetOperatorId — an Admin/platform-Staff caller picking an
            // operator by id, or a scoped operator-side caller whose own BusOperatorId happens
            // to be one. BookingsController.Create already refuses a counter SALE against a
            // non-PlatformManaged trip; this stops the counter from being configured in the
            // first place, which is what actually keeps it out of every operator/counter picker
            // in the UI (see counter-setup.component.ts).
            var targetOperatorMode = await db.BusOperators
                .Where(o => o.Id == targetOperatorId)
                .Select(o => (OperatorInventoryMode?)o.InventoryMode)
                .FirstOrDefaultAsync();

            if (targetOperatorMode == OperatorInventoryMode.ExternalApiManaged)
            {
                return BadRequest(new
                {
                    message = "This operator's inventory is managed entirely through their own ERP " +
                        "(ExternalApiManaged) — TicketPortal never runs a sales counter for them."
                });
            }

            var branchError = await ValidateBranchAsync(dto.OperatorBranchId, targetOperatorId);
            if (branchError != null) return branchError;

            var item = new SalesCounter
            {
                BusOperatorId = targetOperatorId,
                TerminalId = dto.TerminalId,
                OperatorBranchId = dto.OperatorBranchId,
                CounterName = dto.CounterName,
                CounterCode = dto.CounterCode,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
                IsActive = dto.IsActive,
            };

            db.SalesCounters.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, SalesCounterUpdateDto dto)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CounterConfigure)) return Forbid();

            var item = await db.SalesCounters.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "SalesCounter not found." });

            if (!actor.CanManageOperator(item.BusOperatorId)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This SalesCounter was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // Scoped staff can edit their own counter's details but can never move it to another
            // operator. Only unscoped Admin/Staff can reassign BusOperatorId.
            Guid targetOperatorId;
            if (actor.BusOperatorId == null)
            {
                if (!await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                item.BusOperatorId = dto.BusOperatorId;
                targetOperatorId = dto.BusOperatorId;
            }
            else
            {
                targetOperatorId = actor.BusOperatorId.Value;
            }

            var branchError = await ValidateBranchAsync(dto.OperatorBranchId, targetOperatorId);
            if (branchError != null) return branchError;

            item.TerminalId = dto.TerminalId;
            item.OperatorBranchId = dto.OperatorBranchId;
            item.CounterName = dto.CounterName;
            item.CounterCode = dto.CounterCode;
            item.PhoneNumber = dto.PhoneNumber;
            item.Address = dto.Address;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This SalesCounter was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save SalesCounter.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var actor = await currentActor.ResolveAsync(User);
            if (!actor.HasPermission(Permissions.CounterConfigure)) return Forbid();

            var item = await db.SalesCounters.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            if (!actor.CanManageOperator(item.BusOperatorId)) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This SalesCounter was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this SalesCounter — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static SalesCounterResponseDto ToResponseDto(SalesCounter x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            TerminalId = x.TerminalId,
            OperatorBranchId = x.OperatorBranchId,
            CounterName = x.CounterName,
            CounterCode = x.CounterCode,
            PhoneNumber = x.PhoneNumber,
            Address = x.Address,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}

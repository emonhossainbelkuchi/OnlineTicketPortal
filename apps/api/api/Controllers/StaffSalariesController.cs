// Piece 6 (People/HR & ERP Integrations) — StaffSalary operator scoping.
// StaffSalary has no BusOperatorId of its own — ownership is derived through
// StaffProfileId -> StaffProfile.BusOperatorId, so every scoping check here is one join
// away from the SalesCountersController pattern rather than a direct column compare.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.People;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class StaffSalariesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<StaffSalaryResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.StaffSalaries.AsQueryable();
            if (busOperatorId != null)
            {
                query = query.Where(x => x.StaffProfile.BusOperatorId == busOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.StaffSalaries
                .Include(x => x.StaffProfile)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.StaffProfile.BusOperatorId != busOperatorId) return Forbid();

            return Ok(ToResponseDto(item));
        }

        // Confirms staffProfileId is a real StaffProfile and, for scoped callers, that it
        // belongs to their own operator. Returns an error result to short-circuit on, or the
        // resolved StaffProfile's BusOperatorId if everything checks out.
        private async Task<(IActionResult? Error, Guid? OwnerOperatorId)> ValidateStaffProfileAsync(
            Guid staffProfileId, Guid? callerBusOperatorId)
        {
            var profile = await db.StaffProfiles
                .Where(p => p.Id == staffProfileId)
                .Select(p => new { p.BusOperatorId })
                .FirstOrDefaultAsync();

            if (profile == null)
            {
                return (BadRequest(new { message = "StaffProfileId does not match a real StaffProfile." }), null);
            }

            if (callerBusOperatorId != null && profile.BusOperatorId != callerBusOperatorId)
            {
                return (BadRequest(new { message = "That StaffProfile belongs to a different operator." }), null);
            }

            return (null, profile.BusOperatorId);
        }

        [HttpPost]
        public async Task<IActionResult> Create(StaffSalaryCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            var (error, _) = await ValidateStaffProfileAsync(dto.StaffProfileId, busOperatorId);
            if (error != null) return error;

            var item = new StaffSalary
            {
                StaffProfileId = dto.StaffProfileId,
                PayPeriodStart = dto.PayPeriodStart,
                PayPeriodEnd = dto.PayPeriodEnd,
                Amount = dto.Amount,
                IsPaid = dto.IsPaid,
                PaidAtUtc = dto.PaidAtUtc,
                PaymentReference = dto.PaymentReference,
            };

            db.StaffSalaries.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, StaffSalaryUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.StaffSalaries
                .Include(x => x.StaffProfile)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "StaffSalary not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.StaffProfile.BusOperatorId != busOperatorId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This StaffSalary was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // StaffProfileId is never reassignable via a generic edit — see the DTO's header
            // note — so there's nothing further to validate about ownership here beyond the
            // Forbid() check above.
            item.PayPeriodStart = dto.PayPeriodStart;
            item.PayPeriodEnd = dto.PayPeriodEnd;
            item.Amount = dto.Amount;
            item.IsPaid = dto.IsPaid;
            item.PaidAtUtc = dto.PaidAtUtc;
            item.PaymentReference = dto.PaymentReference;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffSalary was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save StaffSalary.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.StaffSalaries
                .Include(x => x.StaffProfile)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.StaffProfile.BusOperatorId != busOperatorId) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This StaffSalary was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this StaffSalary — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static StaffSalaryResponseDto ToResponseDto(StaffSalary x) => new()
        {
            Id = x.Id,
            StaffProfileId = x.StaffProfileId,
            PayPeriodStart = x.PayPeriodStart,
            PayPeriodEnd = x.PayPeriodEnd,
            Amount = x.Amount,
            IsPaid = x.IsPaid,
            PaidAtUtc = x.PaidAtUtc,
            PaymentReference = x.PaymentReference,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}

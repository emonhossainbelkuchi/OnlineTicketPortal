// Piece 5 (Operator Back-Office & Fleet Operations) — operator scoping. 🟡 tier per the
// completion plan: CRUD shape was fine, but any authenticated user could read and write every
// operator's own branch network. Now an operator's own staff only ever sees/touches their own
// operator's branches; platform Staff/Admin see and manage everything.
//
// Role note (applies to every controller in this piece): the Completion Plan's Section 2 example
// gate only checks IsInRole("Admin")/IsInRole("Staff") — that text predates Piece 1. Piece 1
// actually shipped THREE login-permission tiers: "Staff" is our own platform staff, "Operator" is
// an operator's own staff, "Admin" is platform admin (see CreateStaffAccountDto's comment in
// AdminDtos.cs). So the gate here checks all three; StaffProfile.BusOperatorId (via
// ClaimsPrincipalExtensions.GetBusOperatorIdAsync — null = platform, set = exactly one operator)
// is what actually narrows the query once someone's past the gate.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.CompanyNetwork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorBranchesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<OperatorBranchResponseDto>());
            }

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            var query = db.OperatorBranches.AsQueryable();
            if (busOperatorId != null)
            {
                query = query.Where(x => x.BusOperatorId == busOperatorId);
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.OperatorBranches.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(OperatorBranchCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);

            // Scoped (operator's own staff): the branch always belongs to THEIR operator —
            // whatever the client sent in BusOperatorId is ignored outright, not just validated,
            // so there's no payload shape that can create a branch under another operator.
            Guid targetOperatorId;
            if (busOperatorId != null)
            {
                targetOperatorId = busOperatorId.Value;
            }
            else
            {
                // Unscoped (platform Admin/Staff): they manage branches on behalf of any
                // operator, so BusOperatorId has to come from the request — just make sure it
                // actually points at a real one.
                if (!await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                targetOperatorId = dto.BusOperatorId;
            }

            var item = new OperatorBranch
            {
                BusOperatorId = targetOperatorId,
                BranchName = dto.BranchName,
                Address = dto.Address,
                Phone = dto.Phone,
                City = dto.City,
                District = dto.District,
            };

            db.OperatorBranches.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, OperatorBranchUpdateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.OperatorBranches.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "OperatorBranch not found." });

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This OperatorBranch was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // Scoped staff can edit their own branch's details but can never move it to another
            // operator — BusOperatorId stays put. Only unscoped Admin/Staff can reassign it.
            if (busOperatorId == null)
            {
                if (!await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId))
                {
                    return BadRequest(new { message = "BusOperatorId does not match a real BusOperator." });
                }
                item.BusOperatorId = dto.BusOperatorId;
            }

            item.BranchName = dto.BranchName;
            item.Address = dto.Address;
            item.Phone = dto.Phone;
            item.City = dto.City;
            item.District = dto.District;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorBranch was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save OperatorBranch.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var item = await db.OperatorBranches.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            var busOperatorId = await User.GetBusOperatorIdAsync(db);
            if (busOperatorId != null && item.BusOperatorId != busOperatorId) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorBranch was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this OperatorBranch — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static OperatorBranchResponseDto ToResponseDto(OperatorBranch x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            BranchName = x.BranchName,
            Address = x.Address,
            Phone = x.Phone,
            City = x.City,
            District = x.District,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}

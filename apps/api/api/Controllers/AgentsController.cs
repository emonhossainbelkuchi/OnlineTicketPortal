// Piece 6 (People/HR & ERP Integrations) — "ownership/Admin scoping as appropriate" per the
// completion plan. An Agent isn't owned by a customer, so the customer-ownership pattern used
// elsewhere in this piece doesn't apply — instead this follows the operator-scoping half of the
// same 🟡 tier definition (Section 1): customers blocked entirely; among Staff, an operator's
// own staff only see/write agents tied to their OWN operator (Agent.BusOperatorId, checked
// directly — no join needed, unlike DriverLicense/StaffAttendance/StaffSalary); platform
// Staff/Admin see everything, including platform-wide agents (BusOperatorId == null, per the
// model's own comment: "Null if this agent isn't tied to one specific operator").
//
// BusOperatorId is verified/overridden on Create rather than trusted as-is — an operator's own
// staff can only ever create agents for themselves, never a platform-wide agent and never
// another operator's. Dropped from Update entirely (see PeopleDtos.cs) — never reassignable
// after creation via this endpoint.

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
    public class AgentsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator"))
            {
                return Ok(Array.Empty<AgentResponseDto>());
            }

            var query = db.Agents.AsQueryable();

            if (!User.IsInRole("Admin"))
            {
                var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
                if (scopeOperatorId != null)
                {
                    query = query.Where(a => a.BusOperatorId == scopeOperatorId);
                }
            }

            var items = await query.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await db.Agents.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();
            return Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(AgentCreateDto dto)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff") && !User.IsInRole("Operator")) return Forbid();

            var busOperatorId = dto.BusOperatorId;
            if (!User.IsInRole("Admin"))
            {
                var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
                if (scopeOperatorId != null)
                {
                    if (dto.BusOperatorId != scopeOperatorId)
                    {
                        return BadRequest(new { message = "You can only create agents for your own operator." });
                    }
                    busOperatorId = scopeOperatorId;
                }
                // else: platform Staff — allowed to set any BusOperatorId, including null.
            }

            var item = new Agent
            {
                BusOperatorId = busOperatorId,
                Name = dto.Name,
                AgencyCode = dto.AgencyCode,
                ContactPerson = dto.ContactPerson,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Address = dto.Address,
                CommissionPercentage = dto.CommissionPercentage,
                IsActive = dto.IsActive,
            };

            db.Agents.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, AgentUpdateDto dto)
        {
            var item = await db.Agents.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Agent not found." });
            if (!await CanAccessAsync(item)) return Forbid();

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Agent was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            // BusOperatorId deliberately never touched here — see file header.
            item.Name = dto.Name;
            item.AgencyCode = dto.AgencyCode;
            item.ContactPerson = dto.ContactPerson;
            item.PhoneNumber = dto.PhoneNumber;
            item.Email = dto.Email;
            item.Address = dto.Address;
            item.CommissionPercentage = dto.CommissionPercentage;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Agent was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Agent.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var item = await db.Agents.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();
            if (!await CanAccessAsync(item)) return Forbid();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Agent was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Agent — it is still referenced by other records." });
            }

            return NoContent();
        }

        // Unlike DriverLicense/StaffAttendance/StaffSalary, Agent.BusOperatorId lives directly
        // on the entity (and is nullable — a platform-wide agent) so this checks it straight,
        // no StaffProfile join needed. An operator's own staff never sees a platform-wide
        // (null) agent — only their own operator's.
        private async Task<bool> CanAccessAsync(Agent item)
        {
            if (User.IsInRole("Admin")) return true;
            if (!User.IsInRole("Staff") && !User.IsInRole("Operator")) return false;

            var scopeOperatorId = await User.GetBusOperatorIdAsync(db);
            if (scopeOperatorId == null) return true;

            return item.BusOperatorId == scopeOperatorId;
        }

        private static AgentResponseDto ToResponseDto(Agent x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            Name = x.Name,
            AgencyCode = x.AgencyCode,
            ContactPerson = x.ContactPerson,
            PhoneNumber = x.PhoneNumber,
            Email = x.Email,
            Address = x.Address,
            CommissionPercentage = x.CommissionPercentage,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}

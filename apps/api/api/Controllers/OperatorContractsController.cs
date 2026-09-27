// Piece 1 (Identity, Access Control & Platform Configuration) — Admin-only gate. 🟡 tier per the
// completion plan: structurally fine as generic CRUD, this only ever needed locking down, no new
// service. Was reachable read/write by any authenticated user; now Admin-only end to end —
// contract terms (settlement interval, gateway-fee bearer) directly drive the settlement engine —
// nobody but Admin should be able to edit them. Real Staff/Operator role-scoping
// (StaffProfile.BusOperatorId) doesn't apply here since this is platform-wide reference/finance
// data, not any one operator's own rows.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorContractsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin"))
            {
                return Ok(Array.Empty<OperatorContractResponseDto>());
            }

            var items = await db.OperatorContracts.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.OperatorContracts.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(OperatorContractCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new OperatorContract
            {
                BusOperatorId = dto.BusOperatorId,
                ContractNo = dto.ContractNo,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                SettlementIntervalDays = dto.SettlementIntervalDays,
                GatewayFeeBearer = dto.GatewayFeeBearer,
                IsActive = dto.IsActive,
                Notes = dto.Notes,
            };

            db.OperatorContracts.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, OperatorContractUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.OperatorContracts.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "OperatorContract not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This OperatorContract was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.BusOperatorId = dto.BusOperatorId;
            item.ContractNo = dto.ContractNo;
            item.EffectiveFrom = dto.EffectiveFrom;
            item.EffectiveTo = dto.EffectiveTo;
            item.SettlementIntervalDays = dto.SettlementIntervalDays;
            item.GatewayFeeBearer = dto.GatewayFeeBearer;
            item.IsActive = dto.IsActive;
            item.Notes = dto.Notes;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorContract was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save OperatorContract.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.OperatorContracts.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This OperatorContract was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this OperatorContract — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static OperatorContractResponseDto ToResponseDto(OperatorContract x) => new()
        {
            Id = x.Id,
            BusOperatorId = x.BusOperatorId,
            ContractNo = x.ContractNo,
            EffectiveFrom = x.EffectiveFrom,
            EffectiveTo = x.EffectiveTo,
            SettlementIntervalDays = x.SettlementIntervalDays,
            GatewayFeeBearer = x.GatewayFeeBearer,
            IsActive = x.IsActive,
            Notes = x.Notes,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
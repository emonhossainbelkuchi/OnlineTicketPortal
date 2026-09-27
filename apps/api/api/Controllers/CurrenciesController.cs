// Piece 1 (Identity, Access Control & Platform Configuration) — Admin-only gate. 🟢 tier per the
// completion plan: structurally fine as generic CRUD, this only ever needed locking down, no new
// service. Was reachable read/write by any authenticated user; now Admin-only end to end — which
// currencies the platform accepts and how they're formatted; feeds every money calculation. Real
// Staff/Operator role-scoping (StaffProfile.BusOperatorId) doesn't apply here since this is
// platform-wide reference/finance data, not any one operator's own rows.

using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CurrenciesController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin"))
            {
                return Ok(Array.Empty<CurrencyResponseDto>());
            }

            var items = await db.Currencies.ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Currencies.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CurrencyCreateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = new Currency
            {
                Code = dto.Code,
                Symbol = dto.Symbol,
                ExchangeRateToBase = dto.ExchangeRateToBase,
                IsBaseCurrency = dto.IsBaseCurrency,
                IsActive = dto.IsActive,
            };

            db.Currencies.Add(item);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponseDto(item));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, CurrencyUpdateDto dto)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Currencies.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound(new { message = "Currency not found." });

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
                return BadRequest(new { message = "RowVersion is required." });

            if (!item.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message = "This Currency was changed by another request. Please GET the latest data and try again."
                });
            }

            db.Entry(item).Property(x => x.RowVersion).OriginalValue = dto.RowVersion;

            item.Code = dto.Code;
            item.Symbol = dto.Symbol;
            item.ExchangeRateToBase = dto.ExchangeRateToBase;
            item.IsBaseCurrency = dto.IsBaseCurrency;
            item.IsActive = dto.IsActive;
            item.UpdatedAtUtc = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Currency was already modified or deleted by another request." });
            }
            catch (DbUpdateException ex)
            {
                var error = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return Conflict(new { message = "Could not save Currency.", details = error });
            }

            return Ok(ToResponseDto(item));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var item = await db.Currencies.FirstOrDefaultAsync(x => x.Id == id);
            if (item == null) return NotFound();

            // Soft delete — real business data is never hard-deleted (see AuditableEntity.MarkDeleted).
            item.MarkDeleted();

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This Currency was already modified or deleted by another request." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot delete this Currency — it is still referenced by other records." });
            }

            return NoContent();
        }

        private static CurrencyResponseDto ToResponseDto(Currency x) => new()
        {
            Id = x.Id,
            Code = x.Code,
            Symbol = x.Symbol,
            ExchangeRateToBase = x.ExchangeRateToBase,
            IsBaseCurrency = x.IsBaseCurrency,
            IsActive = x.IsActive,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}
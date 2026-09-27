using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.Integrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only, Admin/platform-Staff-only (see
    // ClaimsPrincipalExtensions.IsPlatformStaffOrAdminAsync — an operator's own scoped
    // Staff/Operator account never qualifies). A record of one attempt to sync data with an
    // operator's own ERP — including RequestJson/ResponseJson from that call — is
    // platform-internal integration detail, not anything a customer or most staff should see.
    // The old generic CRUD let any authenticated user fabricate a fake "Succeeded" sync that
    // never happened. The plain IsInRole("Staff") check this previously used didn't actually
    // enforce "platform-only" — any operator-scoped Staff account passed it too.
    //
    // Nothing writes here yet: the actual sync worker that talks to an operator's ERP is future
    // work (see the ERP-integrations piece), not built here. The write path lands with that
    // worker; this controller is locked down now so there's no open write path waiting for it.
    //
    // UPDATE (Chunk 8): that worker now exists (ExternalBookingSyncService) and writes real
    // rows here on every ConfirmBooking/GetSeatAvailability/CancelBooking/TestConnection call —
    // this controller's own read-side auth was already correctly scoped ahead of that, so
    // nothing needed to change here. See docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class IntegrationSyncLogsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db))
            {
                return Ok(Array.Empty<IntegrationSyncLogResponseDto>());
            }

            var items = await db.IntegrationSyncLogs.OrderByDescending(x => x.StartedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!await User.IsPlatformStaffOrAdminAsync(db)) return Forbid();

            var item = await db.IntegrationSyncLogs.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private static IntegrationSyncLogResponseDto ToResponseDto(IntegrationSyncLog x) => new()
        {
            Id = x.Id,
            OperatorIntegrationId = x.OperatorIntegrationId,
            EntityName = x.EntityName,
            EntityKey = x.EntityKey,
            Operation = x.Operation,
            Status = x.Status,
            StartedAtUtc = x.StartedAtUtc,
            CompletedAtUtc = x.CompletedAtUtc,
            RequestJson = x.RequestJson,
            ResponseJson = x.ResponseJson,
            ErrorMessage = x.ErrorMessage,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}

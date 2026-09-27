using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Read-only, Admin/Staff-only. Raw inbound webhook payloads from a payment gateway are
    // platform/gateway-internal plumbing, not anything a customer has a reason to see — same
    // reasoning as PlatformLedgersController. The old generic CRUD let any authenticated user
    // fabricate a gateway event (including marking one IsProcessed) with no gateway involved.
    //
    // Nothing writes here yet, since no real payment gateway is wired in (see the TODO on
    // PaymentGatewayResultDto) — this is future work for whoever builds the actual webhook
    // receiver endpoint. The controller is locked down now so there's no open write path
    // waiting for that day.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentWebhookEventsController(AppDbContext db) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff"))
            {
                return Ok(Array.Empty<PaymentWebhookEventResponseDto>());
            }

            var items = await db.PaymentWebhookEvents.OrderByDescending(x => x.ReceivedAtUtc).ToListAsync();
            return Ok(items.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            if (!User.IsInRole("Admin") && !User.IsInRole("Staff")) return Forbid();

            var item = await db.PaymentWebhookEvents.FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : Ok(ToResponseDto(item));
        }

        // No POST/PUT/DELETE — see the class comment above.

        private static PaymentWebhookEventResponseDto ToResponseDto(PaymentWebhookEvent x) => new()
        {
            Id = x.Id,
            PaymentId = x.PaymentId,
            PaymentProviderId = x.PaymentProviderId,
            ProviderEventId = x.ProviderEventId,
            EventType = x.EventType,
            ReportedStatus = x.ReportedStatus,
            ReceivedAtUtc = x.ReceivedAtUtc,
            IsProcessed = x.IsProcessed,
            ProcessedAtUtc = x.ProcessedAtUtc,
            PayloadJson = x.PayloadJson,
            ErrorMessage = x.ErrorMessage,
            CreatedAtUtc = x.CreatedAtUtc,
            UpdatedAtUtc = x.UpdatedAtUtc,
            RowVersion = x.RowVersion,
        };
    }
}

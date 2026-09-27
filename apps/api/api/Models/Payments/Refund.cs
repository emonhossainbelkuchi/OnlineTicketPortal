using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // Money being sent back to a customer, usually following an approved CancellationRequest.
    public class Refund : AuditableEntity
    {
        public Guid BookingId { get; set; }
        public Guid PaymentId { get; set; } // Which original payment this refund is against.
        public Guid? CancellationRequestId { get; set; }

        public decimal Amount { get; set; }

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public RefundStatus Status { get; set; } = RefundStatus.Requested;

        [MaxLength(250)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? GatewayRefundReference { get; set; }

        // Guest checkout (no CustomerProfile) has no wallet to credit and no gateway refund
        // integration yet — so a guest refund is only truly "done" once staff has actually
        // paid the guest back by hand (bank/mobile-banking transfer) and recorded the
        // reference here. Only ever set for a guest booking; see RefundProcessingService.
        [MaxLength(100)]
        public string? ManualPayoutReference { get; set; }

        public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? RefundedAtUtc { get; set; }

        public Booking Booking { get; set; } = default!;
        public Payment Payment { get; set; } = default!;
        public CancellationRequest? CancellationRequest { get; set; }
        public ICollection<RefundHistory> Histories { get; set; } = new List<RefundHistory>();

        public bool IsSuccessful() => Status == RefundStatus.Succeeded;
    }
}

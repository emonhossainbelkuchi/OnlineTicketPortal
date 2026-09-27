using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Payments
{
    // One payment option we accept — e.g. "bKash", "SSLCommerz", "Cash at counter". This is
    // the actual extensibility point for "add more payment methods in the future": adding a
    // new one is (mostly) adding a new row here plus its PaymentMethodConfigurations, not
    // rewriting checkout code.
    public class PaymentProvider : AuditableEntity
    {
        [MaxLength(80)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        public PaymentProviderKind ProviderKind { get; set; } = PaymentProviderKind.Gateway;
        public PaymentGateway Gateway { get; set; } = PaymentGateway.None;

        [MaxLength(300)]
        public string? CheckoutBaseUrl { get; set; }

        [MaxLength(300)]
        public string? WebhookUrl { get; set; } // Where this provider sends us payment status updates.

        public bool SupportsRefund { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<PaymentMethodConfiguration> MethodConfigurations { get; set; } = new List<PaymentMethodConfiguration>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}

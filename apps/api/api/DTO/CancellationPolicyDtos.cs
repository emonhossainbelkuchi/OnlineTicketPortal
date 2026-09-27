using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // Details — one refund tier: "cancel with at least MinHours notice, get RefundPercentage%
    // back, minus a FixedCancellationFee". A policy is normally a descending ladder of these
    // (soonest-to-departure = worst refund), though the API doesn't enforce that ordering —
    // it's just the sane way to design the data.
    public class CancellationPolicyRuleCreateDto
    {
        [Range(0, 720)]
        public int MinHoursBeforeDeparture { get; set; }

        // Null = "and everything above MinHours", i.e. this is the top/open-ended tier.
        [Range(0, 720)]
        public int? MaxHoursBeforeDeparture { get; set; }

        [Range(typeof(decimal), "0", "100")]
        public decimal RefundPercentage { get; set; }

        // Can be combined with RefundPercentage (a % cut AND a flat fee) or used alone —
        // set the one you don't need to 0.
        [Range(typeof(decimal), "0", "100000")]
        public decimal FixedCancellationFee { get; set; }
    }

    public class CancellationPolicyRuleResponseDto
    {
        public Guid Id { get; set; }
        public int MinHoursBeforeDeparture { get; set; }
        public int? MaxHoursBeforeDeparture { get; set; }
        public decimal RefundPercentage { get; set; }
        public decimal FixedCancellationFee { get; set; }
    }

    // Master = CancellationPolicy. The most self-contained of the five pairs — BusOperatorId is
    // the only foreign key here, and it's OPTIONAL: leave it null for a platform-wide default
    // policy, or set it to scope a custom policy to one operator.
    public class CancellationPolicyCreateDto
    {
        public Guid? BusOperatorId { get; set; }

        [Required, MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        // Date-type demo fields for this master-detail pair — the validity window during which
        // this policy applies. EffectiveToUtc can be left null for an open-ended policy.
        public DateTime? EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; }

        // Details — the refund tiers that make up this policy.
        [MinLength(1)]
        public List<CancellationPolicyRuleCreateDto> Rules { get; set; } = new();
    }

    public class CancellationPolicyUpdateDto : CancellationPolicyCreateDto
    {
        public bool IsActive { get; set; } = true;
        [Required]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class CancellationPolicyResponseDto
    {
        public Guid Id { get; set; }
        public Guid? BusOperatorId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime? EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }
        public DateTime? DeletedAtUtc { get; set; }

        // Set via POST /api/cancellationpolicies/{id}/images — e.g. a scanned copy of the
        // government-mandated policy notice, if one exists for this policy.
        public string? PolicyDocumentImageUrl { get; set; }
        public List<CancellationPolicyRuleResponseDto> Rules { get; set; } = new();
        [Required]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}

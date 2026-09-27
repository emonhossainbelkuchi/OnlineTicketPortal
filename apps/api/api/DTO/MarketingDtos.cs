using TicketPortal.Api.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // CustomerProfileId is deliberately absent — the controller resolves it from the
    // logged-in user's own claim, never from the request body (a customer used to be able to
    // file a complaint as anyone they liked). Status/ResolvedAtUtc are absent too; those only
    // move through ComplaintsController's staff-only status action below.
    public class ComplaintCreateDto
    {
        public Guid? BookingId { get; set; }

        [Required, MaxLength(120)]
        public string Subject { get; set; } = string.Empty;

        [Required, MaxLength(1000)]
        public string Description { get; set; } = string.Empty;
    }

    public class ComplaintUpdateDto
    {
        public Guid? BookingId { get; set; }

        [Required, MaxLength(120)]
        public string Subject { get; set; } = string.Empty;

        [Required, MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        // Required — optimistic-concurrency token, echo back what GET returned.
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    // Staff-only status transition. ResolvedAtUtc is never client-set here — the controller
    // stamps it automatically the moment Status actually becomes Resolved/Closed.
    public class ComplaintStatusUpdateDto
    {
        public ComplaintStatus Status { get; set; }
    }

    public class ComplaintResponseDto
    {
        public Guid Id { get; set; }
        public Guid CustomerProfileId { get; set; }
        public Guid? BookingId { get; set; }
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public ComplaintStatus Status { get; set; } = ComplaintStatus.Open;
        public DateTime? ResolvedAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    // Admin defines these — Code/rules/limits are all admin-set. UsedCount is never
    // client-settable, in Create or Update: it only ever moves through
    // CouponRedemptionService, one redemption at a time.
    public class CouponCreateDto
    {
        [Required, MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? Description { get; set; }

        public CouponType Type { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinBookingAmount { get; set; }
        public int? UsageLimit { get; set; }
        public int? PerUserLimit { get; set; }
        public DateTime ValidFromUtc { get; set; }
        public DateTime ValidToUtc { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class CouponUpdateDto : CouponCreateDto
    {
        // Required — optimistic-concurrency token, echo back what GET returned.
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class CouponResponseDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public CouponType Type { get; set; }
        public decimal? DiscountAmount { get; set; }
        public decimal? DiscountPercentage { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinBookingAmount { get; set; }
        public int? UsageLimit { get; set; }
        public int UsedCount { get; set; }
        public int? PerUserLimit { get; set; }
        public DateTime ValidFromUtc { get; set; }
        public DateTime ValidToUtc { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    // What a customer actually has at checkout: a typed-in code and the booking they want it
    // applied to. Everything else (which coupon that resolves to, whether it's still valid,
    // who's redeeming it, how big the discount actually is) is worked out server-side by
    // CouponRedemptionService — never trusted from the client.
    public class CouponRedeemDto
    {
        [Required, MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        [Required]
        public Guid BookingId { get; set; }
    }

    public class CouponUsageResponseDto
    {
        public Guid Id { get; set; }
        public Guid CouponId { get; set; }
        public Guid BookingId { get; set; }
        public Guid? CustomerProfileId { get; set; }
        public decimal DiscountApplied { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class OfferCreateDto
    {
        public Guid? BusOperatorId { get; set; }

        [Required, MaxLength(120)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public OfferStatus Status { get; set; } = OfferStatus.Active;
        public DateTime StartDateUtc { get; set; }
        public DateTime EndDateUtc { get; set; }
    }

    public class OfferUpdateDto : OfferCreateDto
    {
        // Required — optimistic-concurrency token, echo back what GET returned.
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class OfferResponseDto
    {
        public Guid Id { get; set; }
        public Guid? BusOperatorId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public OfferStatus Status { get; set; } = OfferStatus.Active;
        public DateTime StartDateUtc { get; set; }
        public DateTime EndDateUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class PromoBannerCreateDto
    {
        [Required, MaxLength(300)]
        public string ImageUrl { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? LinkUrl { get; set; }

        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; }
    }

    public class PromoBannerUpdateDto : PromoBannerCreateDto
    {
        // Required — optimistic-concurrency token, echo back what GET returned.
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class PromoBannerResponseDto
    {
        public Guid Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string? LinkUrl { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    // CustomerProfileId is deliberately absent — resolved server-side, same reasoning as
    // Complaint above. BookingId is required (not optional) here even though the Review model
    // allows it to be null: ReviewsController requires a real, Completed booking on this Trip
    // before a review can be created, so there's always one to record.
    public class ReviewCreateDto
    {
        [Required]
        public Guid TripId { get; set; }

        [Required]
        public Guid BookingId { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }
    }

    // TripId/BookingId/CustomerProfileId are absent on purpose — a review can't be reassigned
    // to a different trip or booking after the fact, only its own rating/comment edited.
    public class ReviewUpdateDto
    {
        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }

        // Required — optimistic-concurrency token, echo back what GET returned.
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }

    public class ReviewResponseDto
    {
        public Guid Id { get; set; }
        public Guid CustomerProfileId { get; set; }
        public Guid TripId { get; set; }
        public Guid? BookingId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}

using TicketPortal.Api.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // Details — which unified route (the "Dhaka to Chittagong" a customer searches for) this
    // operator actually runs, under its own branding/code.
    public class OperatorRouteCreateDto
    {
        [Required]
        public Guid BusRouteId { get; set; }

        [Required, MaxLength(50)]
        public string OperatorRouteCode { get; set; } = string.Empty;

        [MaxLength(160)]
        public string? DisplayName { get; set; }

        // Null = "use whatever BusOperator.InventoryMode says below". Set = this one route
        // breaks the operator's default (e.g. mostly platform-managed, but this one route still
        // runs through the operator's own legacy ERP).
        public OperatorInventoryMode? InventoryModeOverride { get; set; }
    }


    // Used when updating an existing OperatorRoute or adding a new route
    // during BusOperator update.
    public class OperatorRouteUpdateDto
    {
        // Existing route = Id has value
        // New route = Id is null
        public Guid? Id { get; set; }

        [Required]
        public Guid BusRouteId { get; set; }

        [Required, MaxLength(50)]
        public string OperatorRouteCode { get; set; } = string.Empty;

        [MaxLength(160)]
        public string? DisplayName { get; set; }

        // Null = use BusOperator.InventoryMode
        public OperatorInventoryMode? InventoryModeOverride { get; set; }

        public bool IsActive { get; set; } = true;

        // Required when updating an existing OperatorRoute.
        // New route does not need RowVersion.
        public byte[]? RowVersion { get; set; }
    }


    public class OperatorRouteResponseDto
    {
        public Guid Id { get; set; }

        public Guid BusRouteId { get; set; }

        public string OperatorRouteCode { get; set; } = string.Empty;

        public string? DisplayName { get; set; }

        public OperatorInventoryMode? InventoryModeOverride { get; set; }

        public bool IsActive { get; set; }

        // Needed for optimistic concurrency during update
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }


    // Master = BusOperator, a company on the platform. Of the five master-detail pairs in this
    // exercise, this is the only one with no dependency on any other pair's data — every
    // OperatorRoute here just needs an existing BusRouteId (the unified route), which is
    // typically seeded once up front rather than created through its own CRUD endpoint.
    public class BusOperatorCreateDto
    {
        [Required, MaxLength(160)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? LegalName { get; set; }

        [MaxLength(80)]
        public string? RegistrationNumber { get; set; }

        [Required, MaxLength(30)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(120), EmailAddress]
        public string? Email { get; set; }

        [MaxLength(250)]
        public string AddressLine { get; set; } = string.Empty;

        [MaxLength(80)]
        public string City { get; set; } = string.Empty;

        [MaxLength(80)]
        public string District { get; set; } = string.Empty;

        [MaxLength(80)]
        public string Country { get; set; } = "Bangladesh";

        // Number-type demo field for this master-detail pair — the year this operator was
        // founded/started running buses.
        public int? FoundedYear { get; set; }

        // Date-type demo field for this master-detail pair — when this operator was on-boarded
        // onto the platform.
        public DateTime? RegisteredOnUtc { get; set; }

        // Platform-managed = we hold the seat inventory and the operator just gets bookings.
        // ExternalApiManaged = the operator runs their own ERP and we call out to THEM for
        // live seat status (see Models/Integrations/OperatorIntegration).
        public OperatorInventoryMode InventoryMode { get; set; }
            = OperatorInventoryMode.PlatformManaged;

        // Details — the routes this operator actually serves.
        public List<OperatorRouteCreateDto> OperatorRoutes { get; set; }
            = new();
    }


    public class BusOperatorUpdateDto : BusOperatorCreateDto
    {
        public bool IsActive { get; set; } = true;

        // BusOperator concurrency token
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

        // IMPORTANT:
        // Override the Create DTO route list for update.
        // Existing route -> Id + RowVersion required.
        // New route -> Id and RowVersion can be null.
        public new List<OperatorRouteUpdateDto> OperatorRoutes { get; set; }
            = new();
    }


    public class BusOperatorResponseDto
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;


        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; } 
        public DateTime? DeletedAtUtc { get; set; } 


        public string? LegalName { get; set; }
        public string? RegistrationNumber { get; set; }
        public string AddressLine { get; set; } = string.Empty;

        public string ContactPhone { get; set; } = string.Empty;

        public string? Email { get; set; }

        // Set via POST /api/busoperators/{id}/images — a single field directly on the entity,
        // same simple pattern as Trip.CoverImageUrl (as opposed to Bus's multi-photo gallery).
        public string? LogoUrl { get; set; }

        public string City { get; set; } = string.Empty;

        public string District { get; set; } = string.Empty;

        public string Country { get; set; } = string.Empty;

        public int? FoundedYear { get; set; }
        public DateTime? RegisteredOnUtc { get; set; }

        public OperatorInventoryMode InventoryMode { get; set; }

        public bool IsActive { get; set; }

        public List<OperatorRouteResponseDto> OperatorRoutes { get; set; }
            = new();

        // BusOperator concurrency token
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.BusFleet;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Marketing;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.People;
using TicketPortal.Api.Models.Scheduling;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.CompanyNetwork
{
    // ONE bus company using our platform — this is the "tenant" at the centre of the whole
    // marketplace idea. Almost every other table in the system eventually traces back to a
    // BusOperator, because almost everything (buses, routes, staff, money) belongs to one
    // specific operator.
    //
    // The single most important field here is InventoryMode below — it decides whether WE run
    // this operator's seat inventory, or whether THEIR own ERP does and we just plug into it.
    public class BusOperator : AuditableEntity
    {
        [MaxLength(160)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? LegalName { get; set; }

        [MaxLength(80)]
        public string? RegistrationNumber { get; set; }

        [MaxLength(200)]
        public string? LogoUrl { get; set; }

        [MaxLength(30)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? Email { get; set; }

        [MaxLength(160)]
        public string? Website { get; set; }

        [MaxLength(80)]
        public string? TradeLicenseNo { get; set; }

        [MaxLength(80)]
        public string? VatRegistrationNo { get; set; }

        [MaxLength(250)]
        public string AddressLine { get; set; } = string.Empty;

        [MaxLength(80)]
        public string City { get; set; } = string.Empty;

        [MaxLength(80)]
        public string District { get; set; } = string.Empty;

        [MaxLength(80)]
        public string Country { get; set; } = "Bangladesh";

        [MaxLength(30)]
        public string? SupportHotline { get; set; }

        // Number-type demo field for this master-detail pair — the year this operator was
        // founded/started running buses (not to be confused with RegisteredOnUtc below, which
        // is when they joined THIS platform).
        public int? FoundedYear { get; set; }

        // Date-type demo field for this master-detail pair — when this operator was on-boarded
        // onto the platform (signed up / approved), as opposed to FoundedYear above.
        public DateTime? RegisteredOnUtc { get; set; }

        // The platform-wide default for this operator: do WE own their seat map
        // (PlatformManaged — normal case, includes using our cash-counter ERP too), or does
        // THEIR OWN ERP own it and we just sell online through their API (ExternalApiManaged)?
        // Individual routes can override this via OperatorRoute.InventoryModeOverride.
        public OperatorInventoryMode InventoryMode { get; set; } = OperatorInventoryMode.PlatformManaged;

        public bool IsActive { get; set; } = true;

        // --- Fleet & routes this operator runs ---
        public ICollection<Bus> Buses { get; set; } = new List<Bus>();
        public ICollection<OperatorRoute> OperatorRoutes { get; set; } = new List<OperatorRoute>();
        public ICollection<Trip> Trips { get; set; } = new List<Trip>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();

        // --- Where they sell / who works for them ---
        public ICollection<SalesCounter> SalesCounters { get; set; } = new List<SalesCounter>();
        public ICollection<StaffProfile> StaffProfiles { get; set; } = new List<StaffProfile>();

        // --- Pricing & policy ---
        public ICollection<FareRule> FareRules { get; set; } = new List<FareRule>();
        public ICollection<CancellationPolicy> CancellationPolicies { get; set; } = new List<CancellationPolicy>();
        public ICollection<OperatorBranch> Branches { get; set; } = new List<OperatorBranch>();
        public ICollection<OperatorSetting> Settings { get; set; } = new List<OperatorSetting>();
        public ICollection<Offer> Offers { get; set; } = new List<Offer>();

        // --- Money: commission agreement + everything that flows from it ---
        public ICollection<OperatorContract> Contracts { get; set; } = new List<OperatorContract>();
        public ICollection<CommissionRule> CommissionRules { get; set; } = new List<CommissionRule>();
        public OperatorWallet? OperatorWallet { get; set; } // Fast-read "how much do we owe them right now" cache.
        public ICollection<OperatorStatement> OperatorStatements { get; set; } = new List<OperatorStatement>();
        public ICollection<OperatorInvoice> OperatorInvoices { get; set; } = new List<OperatorInvoice>();
        public ICollection<OperatorPayout> OperatorPayouts { get; set; } = new List<OperatorPayout>();
        public ICollection<OperatorSettlement> OperatorSettlements { get; set; } = new List<OperatorSettlement>();
        public ICollection<PlatformLedger> PlatformLedgers { get; set; } = new List<PlatformLedger>(); // Full money-movement history for this operator.

        // --- If they connect their own ERP to us ---
        public ICollection<OperatorIntegration> Integrations { get; set; } = new List<OperatorIntegration>();
    }
}

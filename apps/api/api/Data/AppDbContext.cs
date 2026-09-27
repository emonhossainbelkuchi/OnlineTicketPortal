using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.BusFleet;
using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Configuration;
using TicketPortal.Api.Models.Diagnostics;
using TicketPortal.Api.Models.Finance;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Marketing;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.People;
using TicketPortal.Api.Models.Scheduling;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Linq.Expressions;

namespace TicketPortal.Api.Data
{
    // This class is the bridge between our C# model classes and the actual database. Every
    // "DbSet<T>" below is basically a database table. IdentityDbContext<...> as the base class
    // means ASP.NET's built-in login system (Users, Roles, etc.) is already wired in — we're
    // just adding all our own business tables on top of it.
    public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // --- Bookings & tickets ---
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<BookingPassenger> BookingPassengers => Set<BookingPassenger>();
        public DbSet<CancellationPolicy> CancellationPolicies => Set<CancellationPolicy>();
        public DbSet<CancellationPolicyRule> CancellationPolicyRules => Set<CancellationPolicyRule>();
        public DbSet<CancellationRequest> CancellationRequests => Set<CancellationRequest>();
        public DbSet<SeatHold> SeatHolds => Set<SeatHold>();
        public DbSet<SeatHoldItem> SeatHoldItems => Set<SeatHoldItem>();
        public DbSet<Ticket> Tickets => Set<Ticket>();

        // --- Buses, seats & fleet ---
        public DbSet<Bus> Buses => Set<Bus>();
        public DbSet<BusAmenity> BusAmenities => Set<BusAmenity>();
        public DbSet<BusAmenityMapping> BusAmenityMappings => Set<BusAmenityMapping>();
        public DbSet<BusCategory> BusCategories => Set<BusCategory>();
        public DbSet<BusImage> BusImages => Set<BusImage>();
        public DbSet<BusMaintenanceLog> BusMaintenanceLogs => Set<BusMaintenanceLog>();
        public DbSet<Seat> Seats => Set<Seat>();

        // --- Operators, routes & terminals ---
        public DbSet<BusOperator> BusOperators => Set<BusOperator>();
        public DbSet<BusRoute> BusRoutes => Set<BusRoute>();
        public DbSet<OperatorBranch> OperatorBranches => Set<OperatorBranch>();
        public DbSet<OperatorRoute> OperatorRoutes => Set<OperatorRoute>();
        public DbSet<OperatorRouteStop> OperatorRouteStops => Set<OperatorRouteStop>();
        public DbSet<OperatorSetting> OperatorSettings => Set<OperatorSetting>();
        public DbSet<RouteStop> RouteStops => Set<RouteStop>();
        public DbSet<Terminal> Terminals => Set<Terminal>();

        // --- Platform-wide settings ---
        public DbSet<Language> Languages => Set<Language>();
        public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

        // --- Logs & diagnostics ---
        public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<LoginHistory> LoginHistories => Set<LoginHistory>();
        public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

        // --- Money: commission, statements, settlements, invoices, the ledger ---
        public DbSet<CommissionRule> CommissionRules => Set<CommissionRule>();
        public DbSet<OperatorContract> OperatorContracts => Set<OperatorContract>();
        public DbSet<OperatorInvoice> OperatorInvoices => Set<OperatorInvoice>();
        public DbSet<OperatorPaymentReceipt> OperatorPaymentReceipts => Set<OperatorPaymentReceipt>();
        public DbSet<OperatorPayout> OperatorPayouts => Set<OperatorPayout>();
        public DbSet<OperatorSettlement> OperatorSettlements => Set<OperatorSettlement>();
        public DbSet<OperatorSettlementItem> OperatorSettlementItems => Set<OperatorSettlementItem>();
        public DbSet<OperatorStatement> OperatorStatements => Set<OperatorStatement>();
        public DbSet<OperatorStatementItem> OperatorStatementItems => Set<OperatorStatementItem>();
        public DbSet<OperatorWallet> OperatorWallets => Set<OperatorWallet>();
        public DbSet<PlatformLedger> PlatformLedgers => Set<PlatformLedger>();

        // --- Connecting to an operator's own ERP ---
        public DbSet<OperatorIntegration> OperatorIntegrations => Set<OperatorIntegration>();
        public DbSet<OperatorIntegrationEndpoint> OperatorIntegrationEndpoints => Set<OperatorIntegrationEndpoint>();
        public DbSet<ExternalRouteMapping> ExternalRouteMappings => Set<ExternalRouteMapping>();
        public DbSet<ExternalTripMapping> ExternalTripMappings => Set<ExternalTripMapping>();
        public DbSet<ExternalSeatMapping> ExternalSeatMappings => Set<ExternalSeatMapping>();
        public DbSet<ExternalBookingMapping> ExternalBookingMappings => Set<ExternalBookingMapping>();
        public DbSet<IntegrationSyncLog> IntegrationSyncLogs => Set<IntegrationSyncLog>();
        public DbSet<IntegrationWebhookLog> IntegrationWebhookLogs => Set<IntegrationWebhookLog>();

        // --- Marketing: offers, coupons, reviews, complaints ---
        public DbSet<Complaint> Complaints => Set<Complaint>();
        public DbSet<Coupon> Coupons => Set<Coupon>();
        public DbSet<CouponUsage> CouponUsages => Set<CouponUsage>();
        public DbSet<Offer> Offers => Set<Offer>();
        public DbSet<PromoBanner> PromoBanners => Set<PromoBanner>();
        public DbSet<Review> Reviews => Set<Review>();

        // --- Pricing & payments ---
        public DbSet<Currency> Currencies => Set<Currency>();
        public DbSet<FareRule> FareRules => Set<FareRule>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<PaymentHistory> PaymentHistories => Set<PaymentHistory>();
        public DbSet<PaymentMethodConfiguration> PaymentMethodConfigurations => Set<PaymentMethodConfiguration>();
        public DbSet<PaymentProvider> PaymentProviders => Set<PaymentProvider>();
        public DbSet<PaymentWebhookEvent> PaymentWebhookEvents => Set<PaymentWebhookEvent>();
        public DbSet<Refund> Refunds => Set<Refund>();
        public DbSet<RefundHistory> RefundHistories => Set<RefundHistory>();
        public DbSet<TaxRule> TaxRules => Set<TaxRule>();

        // --- People: customers, staff, agents, counters ---
        public DbSet<Agent> Agents => Set<Agent>();
        public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
        public DbSet<CustomerProfile> CustomerProfiles => Set<CustomerProfile>();
        public DbSet<CustomerWalletTransaction> CustomerWalletTransactions => Set<CustomerWalletTransaction>();
        public DbSet<DriverLicense> DriverLicenses => Set<DriverLicense>();
        public DbSet<EmergencyContact> EmergencyContacts => Set<EmergencyContact>();
        public DbSet<SalesCounter> SalesCounters => Set<SalesCounter>();
        public DbSet<StaffAttendance> StaffAttendances => Set<StaffAttendance>();
        public DbSet<StaffProfile> StaffProfiles => Set<StaffProfile>();
        // RBAC Amendment v3 task 4: which counter(s) a CounterStaff member may sell from.
        public DbSet<StaffSalesCounterAssignment> StaffSalesCounterAssignments => Set<StaffSalesCounterAssignment>();
        public DbSet<StaffSalary> StaffSalaries => Set<StaffSalary>();

        // --- Scheduling & trips ---
        public DbSet<Schedule> Schedules => Set<Schedule>();
        public DbSet<Trip> Trips => Set<Trip>();
        public DbSet<TripCrew> TripCrews => Set<TripCrew>();
        public DbSet<TripSeat> TripSeats => Set<TripSeat>();
        public DbSet<TripStatusHistory> TripStatusHistories => Set<TripStatusHistory>();

        // EF Core calls this once, on startup, to work out the actual database structure (which
        // tables link to which, which columns are unique, etc). We split the work into five
        // clearly-named steps below instead of one giant method, so each concern stays readable
        // on its own.
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); // Sets up ASP.NET's own login tables first.

            ConfigureRelationships(modelBuilder);         // How tables link to each other.
            ConfigureIndexes(modelBuilder);                // What must be unique / fast to search.
            ConfigureDecimalPrecision(modelBuilder);       // How money numbers are stored.
            ConfigureSoftDeleteFilters(modelBuilder);      // Hide soft-deleted rows automatically.
            ConfigureRestrictDeleteBehavior(modelBuilder); // Stop accidental data loss on delete.
        }

        // Most table-to-table links don't need to be spelled out here — Entity Framework can
        // usually figure them out on its own just from the property names. This method only
        // exists for the AMBIGUOUS cases: mainly places where one table points at the SAME
        // other table more than once (e.g. a route has both an origin AND a destination
        // terminal — EF can't guess which is which on its own), so we tell it explicitly.
        private static void ConfigureRelationships(ModelBuilder modelBuilder)
        {
            // A login account (ApplicationUser) has EITHER a CustomerProfile OR a StaffProfile,
            // never both — these two lines wire each one up as its own one-to-one link.
            modelBuilder.Entity<ApplicationUser>()
                .HasOne(user => user.CustomerProfile)
                .WithOne(profile => profile.User)
                .HasForeignKey<CustomerProfile>(profile => profile.UserId);

            modelBuilder.Entity<ApplicationUser>()
                .HasOne(user => user.StaffProfile)
                .WithOne(profile => profile.User)
                .HasForeignKey<StaffProfile>(profile => profile.UserId);

            // Which amenities (WiFi, AC, etc.) a bus actually has.
            modelBuilder.Entity<BusAmenityMapping>()
                .HasOne(mapping => mapping.Bus)
                .WithMany(bus => bus.AmenityMappings)
                .HasForeignKey(mapping => mapping.BusId);

            modelBuilder.Entity<BusAmenityMapping>()
                .HasOne(mapping => mapping.Amenity)
                .WithMany(amenity => amenity.BusMappings)
                .HasForeignKey(mapping => mapping.BusAmenityId);

            // -- Shared routes & terminals: BusRoute points at Terminal TWICE (origin and
            // destination), so we have to tell EF which navigation property matches which FK. --
            modelBuilder.Entity<BusRoute>()
                .HasOne(route => route.OriginTerminal)
                .WithMany(terminal => terminal.OriginRoutes)
                .HasForeignKey(route => route.OriginTerminalId);

            modelBuilder.Entity<BusRoute>()
                .HasOne(route => route.DestinationTerminal)
                .WithMany(terminal => terminal.DestinationRoutes)
                .HasForeignKey(route => route.DestinationTerminalId);

            // The optional "return journey" route, pointing back at another BusRoute.
            modelBuilder.Entity<BusRoute>()
                .HasOne(route => route.ReverseRoute)
                .WithMany()
                .HasForeignKey(route => route.ReverseRouteId);

            modelBuilder.Entity<RouteStop>()
                .HasOne(stop => stop.BusRoute)
                .WithMany(route => route.RouteStops)
                .HasForeignKey(stop => stop.BusRouteId);

            modelBuilder.Entity<RouteStop>()
                .HasOne(stop => stop.Terminal)
                .WithMany(terminal => terminal.RouteStops)
                .HasForeignKey(stop => stop.TerminalId);

            // -- An operator's own version of a shared route. --
            modelBuilder.Entity<OperatorRoute>()
                .HasOne(route => route.BusOperator)
                .WithMany(op => op.OperatorRoutes)
                .HasForeignKey(route => route.BusOperatorId);

            modelBuilder.Entity<OperatorRoute>()
                .HasOne(route => route.BusRoute)
                .WithMany(route => route.OperatorRoutes)
                .HasForeignKey(route => route.BusRouteId);

            modelBuilder.Entity<OperatorRouteStop>()
                .HasOne(stop => stop.OperatorRoute)
                .WithMany(route => route.OperatorRouteStops)
                .HasForeignKey(stop => stop.OperatorRouteId);

            modelBuilder.Entity<OperatorRouteStop>()
                .HasOne(stop => stop.Terminal)
                .WithMany(terminal => terminal.OperatorRouteStops)
                .HasForeignKey(stop => stop.TerminalId);

            modelBuilder.Entity<SalesCounter>()
                .HasOne(counter => counter.OperatorBranch)
                .WithMany(branch => branch.SalesCounters)
                .HasForeignKey(counter => counter.OperatorBranchId);

            modelBuilder.Entity<Schedule>()
                .HasOne(schedule => schedule.OperatorRoute)
                .WithMany(route => route.Schedules)
                .HasForeignKey(schedule => schedule.OperatorRouteId);

            // -- Trips: same "points at Terminal twice" situation as BusRoute above, this time
            // for THIS specific trip's actual departure/arrival point. --
            modelBuilder.Entity<Trip>()
                .HasOne(trip => trip.OperatorRoute)
                .WithMany(route => route.Trips)
                .HasForeignKey(trip => trip.OperatorRouteId);

            modelBuilder.Entity<Trip>()
                .HasOne(trip => trip.DepartureTerminal)
                .WithMany()
                .HasForeignKey(trip => trip.DepartureTerminalId);

            modelBuilder.Entity<Trip>()
                .HasOne(trip => trip.ArrivalTerminal)
                .WithMany()
                .HasForeignKey(trip => trip.ArrivalTerminalId);

            // A booking's actual boarding/dropping point can be an intermediate stop, so it
            // gets its own pair of Terminal links, separate from the trip's overall ones above.
            modelBuilder.Entity<Booking>()
                .HasOne(booking => booking.BoardingTerminal)
                .WithMany()
                .HasForeignKey(booking => booking.BoardingTerminalId);

            modelBuilder.Entity<Booking>()
                .HasOne(booking => booking.DroppingTerminal)
                .WithMany()
                .HasForeignKey(booking => booking.DroppingTerminalId);

            // -- The seat-hold -> booking -> ticket chain. --
            // A Booking optionally comes FROM one SeatHold (the timer that led to it).
            modelBuilder.Entity<Booking>()
                .HasOne(booking => booking.SeatHold)
                .WithOne(hold => hold.Booking)
                .HasForeignKey<Booking>(booking => booking.SeatHoldId);

            modelBuilder.Entity<SeatHold>()
                .HasOne(hold => hold.Trip)
                .WithMany(trip => trip.SeatHolds)
                .HasForeignKey(hold => hold.TripId);

            modelBuilder.Entity<SeatHoldItem>()
                .HasOne(item => item.SeatHold)
                .WithMany(hold => hold.Items)
                .HasForeignKey(item => item.SeatHoldId);

            modelBuilder.Entity<SeatHoldItem>()
                .HasOne(item => item.TripSeat)
                .WithMany(seat => seat.HoldItems)
                .HasForeignKey(item => item.TripSeatId);

            // Which hold (if any) currently has this seat locked.
            modelBuilder.Entity<TripSeat>()
                .HasOne(seat => seat.CurrentSeatHold)
                .WithMany()
                .HasForeignKey(seat => seat.CurrentSeatHoldId);

            // A Ticket always belongs to exactly one TripSeat, and vice versa (one-to-one).
            modelBuilder.Entity<Ticket>()
                .HasOne(ticket => ticket.TripSeat)
                .WithOne(seat => seat.Ticket)
                .HasForeignKey<Ticket>(ticket => ticket.TripSeatId);

            // -- Payments & providers. --
            modelBuilder.Entity<Payment>()
                .HasOne(payment => payment.PaymentProvider)
                .WithMany(provider => provider.Payments)
                .HasForeignKey(payment => payment.PaymentProviderId);

            modelBuilder.Entity<PaymentMethodConfiguration>()
                .HasOne(config => config.PaymentProvider)
                .WithMany(provider => provider.MethodConfigurations)
                .HasForeignKey(config => config.PaymentProviderId);

            modelBuilder.Entity<PaymentWebhookEvent>()
                .HasOne(webhook => webhook.PaymentProvider)
                .WithMany()
                .HasForeignKey(webhook => webhook.PaymentProviderId);

            // -- The commission / settlement money chain (see Models/Finance for the full story). --
            modelBuilder.Entity<OperatorWallet>()
                .HasOne(wallet => wallet.BusOperator)
                .WithOne(op => op.OperatorWallet)
                .HasForeignKey<OperatorWallet>(wallet => wallet.BusOperatorId);

            modelBuilder.Entity<OperatorContract>()
                .HasOne(contract => contract.BusOperator)
                .WithMany(op => op.Contracts)
                .HasForeignKey(contract => contract.BusOperatorId);

            modelBuilder.Entity<CommissionRule>()
                .HasOne(rule => rule.BusOperator)
                .WithMany(op => op.CommissionRules)
                .HasForeignKey(rule => rule.BusOperatorId);

            modelBuilder.Entity<CommissionRule>()
                .HasOne(rule => rule.OperatorContract)
                .WithMany(contract => contract.CommissionRules)
                .HasForeignKey(rule => rule.OperatorContractId);

            modelBuilder.Entity<OperatorStatement>()
                .HasOne(statement => statement.BusOperator)
                .WithMany(op => op.OperatorStatements)
                .HasForeignKey(statement => statement.BusOperatorId);

            modelBuilder.Entity<OperatorInvoice>()
                .HasOne(invoice => invoice.BusOperator)
                .WithMany(op => op.OperatorInvoices)
                .HasForeignKey(invoice => invoice.BusOperatorId);

            modelBuilder.Entity<OperatorPayout>()
                .HasOne(payout => payout.BusOperator)
                .WithMany(op => op.OperatorPayouts)
                .HasForeignKey(payout => payout.BusOperatorId);

            modelBuilder.Entity<OperatorSettlement>()
                .HasOne(settlement => settlement.BusOperator)
                .WithMany(op => op.OperatorSettlements)
                .HasForeignKey(settlement => settlement.BusOperatorId);

            modelBuilder.Entity<OperatorSettlement>()
                .HasOne(settlement => settlement.OperatorStatement)
                .WithMany(statement => statement.Settlements)
                .HasForeignKey(settlement => settlement.OperatorStatementId);

            modelBuilder.Entity<OperatorSettlement>()
                .HasOne(settlement => settlement.OperatorInvoice)
                .WithMany(invoice => invoice.Settlements)
                .HasForeignKey(settlement => settlement.OperatorInvoiceId);

            // Which ledger "diary" rows a settlement run actually closed out.
            modelBuilder.Entity<PlatformLedger>()
                .HasOne(ledger => ledger.OperatorSettlement)
                .WithMany(settlement => settlement.LedgerEntries)
                .HasForeignKey(ledger => ledger.OperatorSettlementId);

            // Statement/settlement report lines trace back to the ledger row they were copied from.
            modelBuilder.Entity<OperatorStatementItem>()
                .HasOne(item => item.PlatformLedger)
                .WithMany()
                .HasForeignKey(item => item.PlatformLedgerId);

            modelBuilder.Entity<OperatorSettlementItem>()
                .HasOne(item => item.PlatformLedger)
                .WithMany()
                .HasForeignKey(item => item.PlatformLedgerId);

            modelBuilder.Entity<CustomerWalletTransaction>()
                .HasOne(transaction => transaction.CustomerProfile)
                .WithMany(profile => profile.WalletTransactions)
                .HasForeignKey(transaction => transaction.CustomerProfileId);

            // -- Connecting to an operator's own ERP. --
            modelBuilder.Entity<OperatorIntegration>()
                .HasOne(integration => integration.BusOperator)
                .WithMany(op => op.Integrations)
                .HasForeignKey(integration => integration.BusOperatorId);

            modelBuilder.Entity<ExternalRouteMapping>()
                .HasOne(mapping => mapping.OperatorRoute)
                .WithMany(route => route.ExternalRouteMappings)
                .HasForeignKey(mapping => mapping.OperatorRouteId);

            modelBuilder.Entity<ExternalTripMapping>()
                .HasOne(mapping => mapping.Trip)
                .WithMany(trip => trip.ExternalTripMappings)
                .HasForeignKey(mapping => mapping.TripId);

            modelBuilder.Entity<ExternalSeatMapping>()
                .HasOne(mapping => mapping.TripSeat)
                .WithMany(seat => seat.ExternalSeatMappings)
                .HasForeignKey(mapping => mapping.TripSeatId);
        }

        // Every "IsUnique()" below is a rule the DATABASE itself enforces, not just the app code
        // — e.g. two rows can never end up with the same PNR, even if there's ever a bug in the
        // C# side that would otherwise have allowed it. The non-unique indexes just make common
        // lookups (like "seats for this trip") fast instead of scanning the whole table.
        private static void ConfigureIndexes(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Terminal>().HasIndex(t => t.Code).IsUnique();
            modelBuilder.Entity<Terminal>().HasIndex(t => new { t.City, t.District });

            modelBuilder.Entity<BusRoute>().HasIndex(r => r.RouteCode).IsUnique();
            modelBuilder.Entity<BusRoute>().HasIndex(r => new { r.OriginTerminalId, r.DestinationTerminalId }).IsUnique(); // Only one canonical "Dhaka to Chittagong" route can exist.
            modelBuilder.Entity<RouteStop>().HasIndex(s => new { s.BusRouteId, s.StopOrder }).IsUnique();

            modelBuilder.Entity<OperatorRoute>().HasIndex(r => new { r.BusOperatorId, r.BusRouteId }).IsUnique(); // One operator can't have two versions of the same route.
            modelBuilder.Entity<OperatorRoute>().HasIndex(r => new { r.BusOperatorId, r.OperatorRouteCode }).IsUnique();
            modelBuilder.Entity<OperatorRouteStop>().HasIndex(s => new { s.OperatorRouteId, s.StopOrder }).IsUnique();
            modelBuilder.Entity<OperatorRouteStop>().HasIndex(s => new { s.OperatorRouteId, s.TerminalId });

            modelBuilder.Entity<Bus>().HasIndex(b => new { b.BusOperatorId, b.RegistrationNumber }).IsUnique();
            modelBuilder.Entity<Bus>().HasIndex(b => new { b.BusOperatorId, b.CoachNumber });
            modelBuilder.Entity<Seat>().HasIndex(s => new { s.BusId, s.SeatNumber }).IsUnique(); // No duplicate seat numbers on one bus.
            modelBuilder.Entity<BusAmenityMapping>().HasIndex(m => new { m.BusId, m.BusAmenityId }).IsUnique();

            modelBuilder.Entity<Schedule>().HasIndex(s => new { s.BusOperatorId, s.ScheduleCode }).IsUnique();
            modelBuilder.Entity<Trip>().HasIndex(t => new { t.BusOperatorId, t.TripCode }).IsUnique();
            modelBuilder.Entity<Trip>().HasIndex(t => new { t.BusRouteId, t.DepartureTimeUtc }); // Fast "search this route, this date" lookups.
            modelBuilder.Entity<Trip>().HasIndex(t => new { t.BusOperatorId, t.DepartureTimeUtc });

            // -- Seat map & seat holds: these are the busiest, most time-critical lookups in the app. --
            modelBuilder.Entity<TripSeat>().HasIndex(s => new { s.TripId, s.SeatId }).IsUnique();
            modelBuilder.Entity<TripSeat>().HasIndex(s => new { s.TripId, s.SeatNumber }).IsUnique();
            modelBuilder.Entity<TripSeat>().HasIndex(s => new { s.TripId, s.Status }); // Fast "show me available seats for this trip".

            modelBuilder.Entity<SeatHold>().HasIndex(h => h.HoldToken).IsUnique();
            modelBuilder.Entity<SeatHold>().HasIndex(h => new { h.TripId, h.Status, h.HoldExpiresAtUtc });
            // Global index for the background sweep job, which scans across ALL trips for expired holds,
            // not just one trip at a time.
            modelBuilder.Entity<SeatHold>().HasIndex(h => new { h.Status, h.HoldExpiresAtUtc });
            modelBuilder.Entity<SeatHoldItem>().HasIndex(i => new { i.SeatHoldId, i.TripSeatId }).IsUnique();

            modelBuilder.Entity<Booking>().HasIndex(b => b.Pnr).IsUnique(); // A PNR must be one-of-a-kind.
            modelBuilder.Entity<Booking>().HasIndex(b => new { b.TripId, b.Status });
            modelBuilder.Entity<Booking>().HasIndex(b => new { b.BusOperatorId, b.SaleChannel }); // Fast "this operator's online vs counter sales" reporting.
            modelBuilder.Entity<Booking>().HasIndex(b => b.ExpiresAtUtc);
            modelBuilder.Entity<Ticket>().HasIndex(t => t.TicketNumber).IsUnique();
            modelBuilder.Entity<Ticket>().HasIndex(t => t.TripSeatId).IsUnique(); // Enforces the one-ticket-per-seat rule at the database level too.

            modelBuilder.Entity<Payment>().HasIndex(p => p.GatewayTransactionId);
            modelBuilder.Entity<Payment>().HasIndex(p => new { p.BookingId, p.Status });
            modelBuilder.Entity<PaymentProvider>().HasIndex(p => p.Code).IsUnique();
            modelBuilder.Entity<PaymentWebhookEvent>().HasIndex(e => e.ProviderEventId);

            modelBuilder.Entity<Currency>().HasIndex(c => c.Code).IsUnique();
            modelBuilder.Entity<Language>().HasIndex(l => l.Code).IsUnique();
            modelBuilder.Entity<Coupon>().HasIndex(c => c.Code).IsUnique();

            // -- Money / commission side. --
            modelBuilder.Entity<OperatorContract>().HasIndex(c => new { c.BusOperatorId, c.ContractNo }).IsUnique();
            modelBuilder.Entity<CommissionRule>().HasIndex(r => new { r.BusOperatorId, r.SaleChannel, r.EffectiveFrom });
            modelBuilder.Entity<OperatorStatement>().HasIndex(s => s.StatementNo).IsUnique();
            modelBuilder.Entity<OperatorInvoice>().HasIndex(i => i.InvoiceNo).IsUnique();
            modelBuilder.Entity<OperatorSettlement>().HasIndex(s => s.SettlementNo).IsUnique();
            modelBuilder.Entity<OperatorPayout>().HasIndex(p => p.PayoutNo).IsUnique();
            modelBuilder.Entity<PlatformLedger>().HasIndex(l => l.LedgerNo).IsUnique();
            // Supports "current balance for operator X" (SUM query) and "unsettled entries for operator X".
            modelBuilder.Entity<PlatformLedger>().HasIndex(l => new { l.BusOperatorId, l.CreatedAtUtc });
            // Supports "which ledger rows belong to settlement run Y" when building/auditing a settlement.
            modelBuilder.Entity<PlatformLedger>().HasIndex(l => l.OperatorSettlementId);

            modelBuilder.Entity<CustomerWalletTransaction>().HasIndex(t => new { t.CustomerProfileId, t.CreatedAtUtc });

            // -- External ERP integration: every "external key" must be unique PER integration
            // (two different operators could otherwise happen to reuse the same key). --
            modelBuilder.Entity<OperatorIntegration>().HasIndex(i => new { i.BusOperatorId, i.Name }).IsUnique();
            modelBuilder.Entity<ExternalRouteMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.ExternalRouteKey }).IsUnique();
            modelBuilder.Entity<ExternalRouteMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.OperatorRouteId }).IsUnique();
            modelBuilder.Entity<ExternalTripMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.ExternalTripKey }).IsUnique();
            modelBuilder.Entity<ExternalTripMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.TripId }).IsUnique();
            modelBuilder.Entity<ExternalSeatMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.ExternalSeatKey }).IsUnique();
            modelBuilder.Entity<ExternalSeatMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.TripSeatId }).IsUnique();
            modelBuilder.Entity<ExternalBookingMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.ExternalBookingKey }).IsUnique();
            modelBuilder.Entity<ExternalBookingMapping>().HasIndex(m => new { m.OperatorIntegrationId, m.BookingId }).IsUnique();

            // RBAC Amendment v3 task 4: CurrentActorService loads "this staff member's active
            // counter assignments" on every request that needs it — both directions get an
            // index. Uniqueness of "no duplicate active (StaffProfileId, SalesCounterId) row"
            // is enforced in StaffCounterAssignmentsController, not here (see
            // StaffSalesCounterAssignment's doc comment for why).
            modelBuilder.Entity<StaffSalesCounterAssignment>().HasIndex(a => new { a.StaffProfileId, a.IsActive });
            modelBuilder.Entity<StaffSalesCounterAssignment>().HasIndex(a => new { a.SalesCounterId, a.IsActive });
        }

        // Goes through every decimal field on every table and tells the database to store it as
        // 18 digits total, 2 of them after the decimal point (e.g. up to 9999999999999999.99) —
        // which is the normal shape for money in BDT. Doing it here once, automatically, means
        // nobody has to remember to add this by hand on every single price/amount field.
        private static void ConfigureDecimalPrecision(ModelBuilder modelBuilder)
        {
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                var decimalProperties = entityType.ClrType.GetProperties()
                    .Where(property => property.PropertyType == typeof(decimal) || property.PropertyType == typeof(decimal?));

                foreach (var property in decimalProperties)
                {
                    modelBuilder.Entity(entityType.ClrType)
                        .Property(property.Name)
                        .HasPrecision(18, 2);
                }
            }
        }

        // We never want a "delete" to actually erase business data — see AuditableEntity's
        // IsDeleted flag. This method makes that automatic: it finds every table that has an
        // IsDeleted flag and quietly adds "...WHERE IsDeleted = false" to every normal query
        // against it. So the rest of the app can just ask for "all bookings" and never see
        // deleted ones by accident, without every single query needing to remember to filter them out.
        private static void ConfigureSoftDeleteFilters(ModelBuilder modelBuilder)
        {
            foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                         .Where(entityType => typeof(AuditableEntity).IsAssignableFrom(entityType.ClrType)))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "entity");
                var isDeletedProperty = Expression.Property(parameter, nameof(AuditableEntity.IsDeleted));
                var compareExpression = Expression.Equal(isDeletedProperty, Expression.Constant(false));
                var lambda = Expression.Lambda(compareExpression, parameter);

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }

        // By default, deleting a row can silently "cascade" and delete everything linked to it
        // too (e.g. deleting a Booking could wipe out its Payments and Tickets). For a system
        // that deals with real money and real tickets, that's dangerous. This forces EVERY
        // relationship in the whole database to Restrict instead: if something still points at
        // the row you're trying to delete, the delete is blocked until you deal with that
        // linked data on purpose. Combined with soft-delete above, actual hard deletes should
        // be rare and deliberate anyway.
        private static void ConfigureRestrictDeleteBehavior(ModelBuilder modelBuilder)
        {
            foreach (var foreignKey in modelBuilder.Model.GetEntityTypes().SelectMany(entity => entity.GetForeignKeys()))
            {
                foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
    }
}

using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.BusFleet;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Configuration;
using TicketPortal.Api.Models.Diagnostics;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Finance;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Marketing;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.People;
using TicketPortal.Api.Models.Scheduling;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace TicketPortal.Api.Data
{
  // Rich, click-through-able demo dataset layered on top of DbSeeder's minimal reference data
  // (terminals, routes, roles, the bootstrap Admin). Everything here is built by driving the
  // SAME application services a real request would use (SeatHoldService, PaymentConfirmationService,
  // FinanceLedgerService, CouponRedemptionService, CancellationProcessingService,
  // RefundProcessingService, SettlementGenerationService, InvoicePaymentService,
  // PayoutProcessingService) so the resulting rows are exactly as internally consistent as
  // anything the API itself would produce — no hand-rolled ledger math here.
  //
  // Safe to run on every startup: it does nothing once BusOperators already has any rows.
  public static class DemoDataSeeder
  {
    private const string DemoPassword = "Demo@12345";

    public static async Task SeedAsync(AppDbContext db, UserManager<ApplicationUser> userManager, IConfiguration configuration)
    {
      if (await db.BusOperators.AnyAsync())
      {
        return;
      }

      var ctx = new DemoContext();

      await SeedGlobalReferenceDataAsync(db, ctx);
      await SeedOperatorsAsync(db, ctx);
      await SeedCancellationPoliciesAsync(db, ctx);
      await SeedFleetAsync(db, ctx);
      await SeedStaffAsync(db, userManager, ctx);
      await SeedAgentsAndCountersAsync(db, ctx);
      await SeedCustomersAsync(db, userManager, ctx);
      await SeedOperatorRoutesAsync(db, ctx);
      await SeedHanifIntegrationAsync(db, ctx, configuration);
      await SeedSchedulesAndTripsAsync(db, ctx);
      await SeedCouponsAsync(db, ctx);
      await SeedOffersAndBannersAsync(db, ctx);
      await SeedFareRulesAsync(db, ctx);
      await SeedBookingScenariosAsync(db, ctx);
      await SeedReviewsAndComplaintsAsync(db, ctx);
      await SeedFinanceCycleAsync(db, ctx);
      await SeedDiagnosticsAsync(db, ctx);
    }

    // Keyed lookups so later stages can find what earlier stages created without re-querying
    // the database every time. Purely an in-process convenience for this one seeding run.
    private sealed class DemoContext
    {
      public BusOperator GreenLine = default!;
      public BusOperator Ena = default!;
      public BusOperator Shohagh = default!;
      public BusOperator Hanif = default!;
      public OperatorIntegration HanifIntegration = default!;

      public readonly Dictionary<string, BusCategory> BusCategories = new();
      public readonly Dictionary<string, BusAmenity> Amenities = new();
      public readonly Dictionary<string, PaymentProvider> Providers = new();
      public readonly Dictionary<string, CancellationPolicy> CancellationPolicies = new();
      public readonly Dictionary<string, Bus> Buses = new();
      public readonly Dictionary<string, OperatorRoute> OperatorRoutes = new();
      public readonly Dictionary<string, Trip> Trips = new();
      public readonly Dictionary<string, StaffProfile> Staff = new();
      public readonly Dictionary<string, ApplicationUser> StaffUsers = new();
      public readonly Dictionary<string, Agent> Agents = new();
      public readonly Dictionary<string, SalesCounter> Counters = new();
      public readonly Dictionary<string, CustomerProfile> Customers = new();
      public readonly Dictionary<string, ApplicationUser> CustomerUsers = new();
      public readonly Dictionary<string, Coupon> Coupons = new();
      public readonly Dictionary<string, Booking> Bookings = new();
    }

    // A passenger to attach to a booking. Kept as a small internal shape so the booking
    // helper below doesn't need a dozen positional parameters.
    private readonly record struct PassengerInfo(
        string FullName, string? Phone, string? Email, Gender Gender, PassengerType Type, int? Age, string? NationalId);

    // ================================================================================
    // 1. Global reference data
    // ================================================================================
    private static async Task SeedGlobalReferenceDataAsync(AppDbContext db, DemoContext ctx)
    {
      var bdt = new Currency { Code = "BDT", Symbol = "৳", ExchangeRateToBase = 1m, IsBaseCurrency = true, IsActive = true };
      var usd = new Currency { Code = "USD", Symbol = "$", ExchangeRateToBase = 0.0084m, IsBaseCurrency = false, IsActive = true };
      db.Currencies.AddRange(bdt, usd);

      db.Languages.AddRange(
          new Language { Code = "en", Name = "English", IsDefault = true, IsActive = true },
          new Language { Code = "bn", Name = "বাংলা", IsDefault = false, IsActive = true });

      db.TaxRules.AddRange(
          new TaxRule { Name = "VAT", Percentage = 5m, IsActive = true },
          new TaxRule { Name = "Travel Surcharge", Percentage = 1m, IsActive = true },
          new TaxRule { Name = "Old Service Tax (Deprecated)", Percentage = 2.5m, IsActive = false });

      var sslcommerz = new PaymentProvider
      {
        Name = "SSLCommerz",
        Code = "SSLCOMMERZ",
        ProviderKind = PaymentProviderKind.Gateway,
        Gateway = PaymentGateway.SslCommerz,
        CheckoutBaseUrl = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
        WebhookUrl = "https://api.ticketportal.com.bd/webhooks/sslcommerz",
        SupportsRefund = true,
        IsActive = true,
      };
      var bkash = new PaymentProvider
      {
        Name = "bKash",
        Code = "BKASH",
        ProviderKind = PaymentProviderKind.MobileBanking,
        Gateway = PaymentGateway.Bkash,
        CheckoutBaseUrl = "https://checkout.pay.bka.sh/v1.2.0-beta",
        WebhookUrl = "https://api.ticketportal.com.bd/webhooks/bkash",
        SupportsRefund = true,
        IsActive = true,
      };
      var nagad = new PaymentProvider
      {
        Name = "Nagad",
        Code = "NAGAD",
        ProviderKind = PaymentProviderKind.MobileBanking,
        Gateway = PaymentGateway.Nagad,
        CheckoutBaseUrl = "https://api.mynagad.com/api/dfs",
        SupportsRefund = true,
        IsActive = true,
      };
      var cashCounter = new PaymentProvider
      {
        Name = "Cash Counter",
        Code = "CASH",
        ProviderKind = PaymentProviderKind.Cash,
        Gateway = PaymentGateway.None,
        SupportsRefund = false,
        IsActive = true,
      };
      var wallet = new PaymentProvider
      {
        Name = "In-App Wallet",
        Code = "WALLET",
        ProviderKind = PaymentProviderKind.Wallet,
        Gateway = PaymentGateway.None,
        SupportsRefund = false,
        IsActive = true,
      };
      db.PaymentProviders.AddRange(sslcommerz, bkash, nagad, cashCounter, wallet);
      await db.SaveChangesAsync();

      db.PaymentMethodConfigurations.AddRange(
          new PaymentMethodConfiguration { PaymentProviderId = sslcommerz.Id, Method = PaymentMethod.Card, DisplayName = "Credit/Debit Card", PercentageFee = 2.5m, IsActive = true },
          new PaymentMethodConfiguration { PaymentProviderId = sslcommerz.Id, Method = PaymentMethod.OnlineGateway, DisplayName = "SSLCommerz Gateway", PercentageFee = 2.5m, IsActive = true },
          new PaymentMethodConfiguration { PaymentProviderId = bkash.Id, Method = PaymentMethod.MobileBanking, DisplayName = "bKash", PercentageFee = 1.8m, IsActive = true },
          new PaymentMethodConfiguration { PaymentProviderId = nagad.Id, Method = PaymentMethod.MobileBanking, DisplayName = "Nagad", PercentageFee = 1.5m, IsActive = true },
          new PaymentMethodConfiguration { PaymentProviderId = cashCounter.Id, Method = PaymentMethod.Cash, DisplayName = "Cash", FixedFee = 0m, IsActive = true },
          new PaymentMethodConfiguration { PaymentProviderId = wallet.Id, Method = PaymentMethod.Wallet, DisplayName = "Wallet Balance", FixedFee = 0m, IsActive = true });

      db.SystemSettings.AddRange(
          new SystemSetting { Key = "PlatformName", Value = "TicketPortal", Description = "Display name shown across the customer site and receipts." },
          new SystemSetting { Key = "SeatHoldMinutes", Value = "5", Description = "How long a seat stays held for a customer at checkout before it's released." },
          new SystemSetting { Key = "SupportEmail", Value = "support@ticketportal.com.bd", Description = "Customer support contact email." },
          new SystemSetting { Key = "SupportHotline", Value = "+8809610123456", Description = "Customer support hotline number." },
          new SystemSetting { Key = "DefaultCurrency", Value = "BDT", Description = "Currency used when none is specified." },
          new SystemSetting { Key = "MaintenanceMode", Value = "false", Description = "When true, the booking site shows a maintenance banner instead of search." });

      var standardFleet = new BusCategory { Name = "Standard Fleet", Description = "Everyday non-AC and AC coaches for regular intercity travel.", IsActive = true };
      var premiumFleet = new BusCategory { Name = "Premium Fleet", Description = "Business-class coaches with extra legroom and onboard service.", IsActive = true };
      var sleeperFleet = new BusCategory { Name = "Sleeper Fleet", Description = "Overnight sleeper cabins for long-haul routes.", IsActive = true };
      db.BusCategories.AddRange(standardFleet, premiumFleet, sleeperFleet);

      var wifiAmenity = new BusAmenity { Name = "WiFi", IsActive = true };
      var acAmenity = new BusAmenity { Name = "Air Conditioning", IsActive = true };
      var chargingAmenity = new BusAmenity { Name = "Charging Port", IsActive = true };
      var blanketAmenity = new BusAmenity { Name = "Blanket & Pillow", IsActive = true };
      var readingLightAmenity = new BusAmenity { Name = "Reading Light", IsActive = true };
      var toiletAmenity = new BusAmenity { Name = "Onboard Toilet", IsActive = true };
      var entertainmentAmenity = new BusAmenity { Name = "LED Entertainment Screen", IsActive = true };
      db.BusAmenities.AddRange(wifiAmenity, acAmenity, chargingAmenity, blanketAmenity, readingLightAmenity, toiletAmenity, entertainmentAmenity);

      await db.SaveChangesAsync();

      ctx.BusCategories["Standard"] = standardFleet;
      ctx.BusCategories["Premium"] = premiumFleet;
      ctx.BusCategories["Sleeper"] = sleeperFleet;
      ctx.Amenities["WiFi"] = wifiAmenity;
      ctx.Amenities["AC"] = acAmenity;
      ctx.Amenities["Charging"] = chargingAmenity;
      ctx.Amenities["Blanket"] = blanketAmenity;
      ctx.Amenities["ReadingLight"] = readingLightAmenity;
      ctx.Amenities["Toilet"] = toiletAmenity;
      ctx.Amenities["Entertainment"] = entertainmentAmenity;
      ctx.Providers["SSLCommerz"] = sslcommerz;
      ctx.Providers["bKash"] = bkash;
      ctx.Providers["Nagad"] = nagad;
      ctx.Providers["Cash"] = cashCounter;
      ctx.Providers["Wallet"] = wallet;
    }

    // ================================================================================
    // 2. Operators + their org structure (branches, settings, contracts, commission
    //    rules, wallets)
    // ================================================================================
    private static async Task SeedOperatorsAsync(AppDbContext db, DemoContext ctx)
    {
      var greenLine = new BusOperator
      {
        Name = "Green Line Paribahan",
        LegalName = "Green Line Paribahan Ltd.",
        RegistrationNumber = "RJSC-1995-00231",
        ContactPhone = "+8802-9611234",
        Email = "info@greenline.com.bd",
        Website = "https://greenline.com.bd",
        TradeLicenseNo = "TRAD/DNCC/045123/2023",
        VatRegistrationNo = "VAT-0011223344",
        AddressLine = "House 33, Road 4, Kolabagan",
        City = "Dhaka",
        District = "Dhaka",
        Country = "Bangladesh",
        SupportHotline = "+8809666712345",
        FoundedYear = 1995,
        RegisteredOnUtc = DateTime.UtcNow.AddYears(-3),
        InventoryMode = OperatorInventoryMode.PlatformManaged,
        IsActive = true,
      };
      var ena = new BusOperator
      {
        Name = "Ena Transport",
        LegalName = "Ena Transport & Distribution Ltd.",
        RegistrationNumber = "RJSC-2005-00987",
        ContactPhone = "+8802-8811456",
        Email = "info@enatransport.com.bd",
        Website = "https://enatransport.com.bd",
        TradeLicenseNo = "TRAD/DNCC/078456/2022",
        VatRegistrationNo = "VAT-0022334455",
        AddressLine = "Kalyanpur Bus Stand Complex",
        City = "Dhaka",
        District = "Dhaka",
        Country = "Bangladesh",
        SupportHotline = "+8809666787654",
        FoundedYear = 2005,
        RegisteredOnUtc = DateTime.UtcNow.AddYears(-2),
        InventoryMode = OperatorInventoryMode.PlatformManaged,
        IsActive = true,
      };
      var shohagh = new BusOperator
      {
        Name = "Shohagh Paribahan",
        LegalName = "Shohagh Paribahan Pvt. Ltd.",
        RegistrationNumber = "RJSC-2000-00456",
        ContactPhone = "+8802-7213456",
        Email = "info@shohagh.com.bd",
        Website = "https://shohagh.com.bd",
        TradeLicenseNo = "TRAD/DNCC/033221/2021",
        VatRegistrationNo = "VAT-0033445566",
        AddressLine = "Kalyanpur, Mirpur Road",
        City = "Dhaka",
        District = "Dhaka",
        Country = "Bangladesh",
        SupportHotline = "+8809666754321",
        FoundedYear = 2000,
        RegisteredOnUtc = DateTime.UtcNow.AddMonths(-15),
        InventoryMode = OperatorInventoryMode.Hybrid,
        IsActive = true,
      };
      var hanif = new BusOperator
      {
        Name = "Hanif Enterprise",
        LegalName = "Hanif Enterprise Group",
        RegistrationNumber = "RJSC-1990-00112",
        ContactPhone = "+8802-9556677",
        Email = "it@hanifenterprise.com.bd",
        Website = "https://hanifenterprise.com.bd",
        TradeLicenseNo = "TRAD/DNCC/012345/2020",
        VatRegistrationNo = "VAT-0044556677",
        AddressLine = "Arambagh, Motijheel",
        City = "Dhaka",
        District = "Dhaka",
        Country = "Bangladesh",
        SupportHotline = "+8809666711223",
        FoundedYear = 1990,
        RegisteredOnUtc = DateTime.UtcNow.AddMonths(-8),
        InventoryMode = OperatorInventoryMode.ExternalApiManaged,
        IsActive = true,
      };

      db.BusOperators.AddRange(greenLine, ena, shohagh, hanif);
      await db.SaveChangesAsync();

      ctx.GreenLine = greenLine;
      ctx.Ena = ena;
      ctx.Shohagh = shohagh;
      ctx.Hanif = hanif;

      db.OperatorBranches.AddRange(
          new OperatorBranch { BusOperatorId = greenLine.Id, BranchName = "Head Office - Kolabagan", Address = "House 33, Road 4, Kolabagan", Phone = "+8802-9611234", City = "Dhaka", District = "Dhaka" },
          new OperatorBranch { BusOperatorId = greenLine.Id, BranchName = "Chittagong Regional Office", Address = "GEC Circle, Chittagong", Phone = "+88031-654321", City = "Chittagong", District = "Chittagong" },
          new OperatorBranch { BusOperatorId = ena.Id, BranchName = "Head Office - Kalyanpur", Address = "Kalyanpur Bus Stand Complex", Phone = "+8802-8811456", City = "Dhaka", District = "Dhaka" },
          new OperatorBranch { BusOperatorId = shohagh.Id, BranchName = "Head Office - Kalyanpur", Address = "Kalyanpur, Mirpur Road", Phone = "+8802-7213456", City = "Dhaka", District = "Dhaka" },
          new OperatorBranch { BusOperatorId = hanif.Id, BranchName = "Head Office - Arambagh", Address = "Arambagh, Motijheel", Phone = "+8802-9556677", City = "Dhaka", District = "Dhaka" });

      db.OperatorSettings.AddRange(
          new OperatorSetting { BusOperatorId = greenLine.Id, Key = "ReceiptFooterText", Value = "Thank you for travelling with Green Line Paribahan!", Description = "Printed at the bottom of counter receipts." },
          new OperatorSetting { BusOperatorId = greenLine.Id, Key = "DefaultSeatHoldMinutes", Value = "5", Description = "Overrides the platform default hold time for this operator's routes." },
          new OperatorSetting { BusOperatorId = shohagh.Id, Key = "ReceiptFooterText", Value = "Shohagh Paribahan - safe journey, every time.", Description = "Printed at the bottom of counter receipts." });

      var oneYearAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-1));
      var glContract = new OperatorContract { BusOperatorId = greenLine.Id, ContractNo = "GLP-CONTRACT-2023-01", EffectiveFrom = oneYearAgo, SettlementIntervalDays = 7, GatewayFeeBearer = GatewayFeeBearer.Operator, IsActive = true, Notes = "Standard weekly settlement agreement." };
      var enaContract = new OperatorContract { BusOperatorId = ena.Id, ContractNo = "ENA-CONTRACT-2023-01", EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-10)), SettlementIntervalDays = 14, GatewayFeeBearer = GatewayFeeBearer.Platform, IsActive = true, Notes = "Bi-weekly settlement; platform absorbs gateway fees." };
      var shoContract = new OperatorContract { BusOperatorId = shohagh.Id, ContractNo = "SHO-CONTRACT-2024-01", EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6)), SettlementIntervalDays = 7, GatewayFeeBearer = GatewayFeeBearer.Operator, IsActive = true };
      var hanContract = new OperatorContract { BusOperatorId = hanif.Id, ContractNo = "HAN-CONTRACT-2025-01", EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-4)), SettlementIntervalDays = 7, GatewayFeeBearer = GatewayFeeBearer.Operator, IsActive = true, Notes = "API-connected operator; online channel only." };
      db.OperatorContracts.AddRange(glContract, enaContract, shoContract, hanContract);
      await db.SaveChangesAsync();

      db.CommissionRules.AddRange(
          new CommissionRule { BusOperatorId = greenLine.Id, OperatorContractId = glContract.Id, SaleChannel = SaleChannel.Online, CommissionType = CommissionType.Percentage, CommissionValue = 10m, EffectiveFrom = oneYearAgo, IsActive = true },
          new CommissionRule { BusOperatorId = greenLine.Id, OperatorContractId = glContract.Id, SaleChannel = SaleChannel.Counter, CommissionType = CommissionType.FixedAmount, CommissionValue = 10m, EffectiveFrom = oneYearAgo, IsActive = true },
          new CommissionRule { BusOperatorId = ena.Id, OperatorContractId = enaContract.Id, SaleChannel = SaleChannel.Online, CommissionType = CommissionType.Percentage, CommissionValue = 8m, EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-10)), IsActive = true },
          new CommissionRule { BusOperatorId = ena.Id, OperatorContractId = enaContract.Id, SaleChannel = SaleChannel.Counter, CommissionType = CommissionType.FixedAmount, CommissionValue = 15m, EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-10)), IsActive = true },
          new CommissionRule { BusOperatorId = shohagh.Id, OperatorContractId = shoContract.Id, SaleChannel = SaleChannel.Online, CommissionType = CommissionType.Percentage, CommissionValue = 9m, EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6)), IsActive = true },
          new CommissionRule { BusOperatorId = shohagh.Id, OperatorContractId = shoContract.Id, SaleChannel = SaleChannel.Counter, CommissionType = CommissionType.FixedAmount, CommissionValue = 12m, EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6)), IsActive = true },
          new CommissionRule { BusOperatorId = hanif.Id, OperatorContractId = hanContract.Id, SaleChannel = SaleChannel.Online, CommissionType = CommissionType.Percentage, CommissionValue = 7m, EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-4)), IsActive = true });

      db.OperatorWallets.AddRange(
          new OperatorWallet { BusOperatorId = greenLine.Id, IsActive = true },
          new OperatorWallet { BusOperatorId = ena.Id, IsActive = true },
          new OperatorWallet { BusOperatorId = shohagh.Id, IsActive = true },
          new OperatorWallet { BusOperatorId = hanif.Id, IsActive = true });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 3. Cancellation policies
    // ================================================================================
    private static async Task SeedCancellationPoliciesAsync(AppDbContext db, DemoContext ctx)
    {
      var standard = new CancellationPolicy
      {
        BusOperatorId = null,
        Name = "Standard Cancellation Policy",
        Description = "Platform-wide default refund tiers based on how close to departure the cancellation is requested.",
        IsActive = true,
        EffectiveFromUtc = DateTime.UtcNow.AddYears(-1),
        Rules = new List<CancellationPolicyRule>
                {
                    new() { MinHoursBeforeDeparture = 72, MaxHoursBeforeDeparture = null, RefundPercentage = 80m, FixedCancellationFee = 20m },
                    new() { MinHoursBeforeDeparture = 24, MaxHoursBeforeDeparture = 72, RefundPercentage = 50m, FixedCancellationFee = 30m },
                    new() { MinHoursBeforeDeparture = 6, MaxHoursBeforeDeparture = 24, RefundPercentage = 20m, FixedCancellationFee = 30m },
                    new() { MinHoursBeforeDeparture = 0, MaxHoursBeforeDeparture = 6, RefundPercentage = 0m, FixedCancellationFee = 0m },
                },
      };

      var shohaghPromo = new CancellationPolicy
      {
        BusOperatorId = ctx.Shohagh.Id,
        Name = "Shohagh No-Refund Promo Fare",
        Description = "Applies to discounted promo-fare trips - no refund at any point before departure.",
        IsActive = true,
        EffectiveFromUtc = DateTime.UtcNow.AddMonths(-3),
        Rules = new List<CancellationPolicyRule>
                {
                    new() { MinHoursBeforeDeparture = 0, MaxHoursBeforeDeparture = null, RefundPercentage = 0m, FixedCancellationFee = 0m },
                },
      };

      db.CancellationPolicies.AddRange(standard, shohaghPromo);
      await db.SaveChangesAsync();

      ctx.CancellationPolicies["Standard"] = standard;
      ctx.CancellationPolicies["ShohaghPromo"] = shohaghPromo;
    }

    // ================================================================================
    // 4. Fleet (buses, seats, amenities, images, maintenance logs)
    // ================================================================================
    private static async Task<Bus> AddBusAsync(
        AppDbContext db, Guid operatorId, Guid categoryId, string regNumber, string coachNumber,
        string brand, string model, int manufactureYear, BusType busType, VehicleFuelType fuelType,
        int rows, int seatsPerRow, SeatType seatType, bool hasWifi, bool hasToilet,
        IEnumerable<Guid> amenityIds, decimal frontRowExtraFare)
    {
      var bus = new Bus
      {
        BusOperatorId = operatorId,
        BusCategoryId = categoryId,
        RegistrationNumber = regNumber,
        CoachNumber = coachNumber,
        Brand = brand,
        Model = model,
        ManufactureYear = manufactureYear,
        RegistrationDate = new DateTime(manufactureYear, 6, 1, 0, 0, 0, DateTimeKind.Utc),
        FuelType = fuelType,
        BusType = busType,
        TotalSeats = rows * seatsPerRow,
        HasWifi = hasWifi,
        HasToilet = hasToilet,
        IsActive = true,
      };
      db.Buses.Add(bus);

      var letters = new[] { "A", "B", "C", "D" };
      for (var r = 1; r <= rows; r++)
      {
        for (var c = 1; c <= seatsPerRow; c++)
        {
          db.Seats.Add(new Seat
          {
            BusId = bus.Id,
            SeatNumber = $"{r}{letters[c - 1]}",
            RowNumber = r,
            ColumnNumber = c,
            DeckLevel = 1,
            SeatType = seatType,
            IsWindow = c == 1 || c == seatsPerRow,
            ExtraFare = r == 1 && frontRowExtraFare > 0 ? frontRowExtraFare : null,
            IsActive = true,
          });
        }
      }

      foreach (var amenityId in amenityIds)
      {
        db.BusAmenityMappings.Add(new BusAmenityMapping { BusId = bus.Id, BusAmenityId = amenityId });
      }

      db.BusImages.Add(new BusImage
      {
        BusId = bus.Id,
        ImageUrl = $"https://picsum.photos/seed/{regNumber.Replace(" ", "").Replace("-", "")}/800/500",
        Caption = $"{brand} {model}",
        IsPrimary = true,
        DisplayOrder = 1,
      });

      db.BusMaintenanceLogs.Add(new BusMaintenanceLog
      {
        BusId = bus.Id,
        MaintenanceDateUtc = DateTime.UtcNow.AddMonths(-2),
        OdometerKm = 80000 + rows * 1500,
        Title = "Routine Service",
        Description = "Engine oil change, brake pad inspection, tyre rotation and AC servicing.",
        Cost = 12500m,
        NextDueDateUtc = DateTime.UtcNow.AddMonths(4),
        PerformedBy = "Central Workshop",
      });

      await db.SaveChangesAsync();
      return bus;
    }

    private static async Task SeedFleetAsync(AppDbContext db, DemoContext ctx)
    {
      var wifi = ctx.Amenities["WiFi"].Id;
      var ac = ctx.Amenities["AC"].Id;
      var charging = ctx.Amenities["Charging"].Id;
      var blanket = ctx.Amenities["Blanket"].Id;
      var readingLight = ctx.Amenities["ReadingLight"].Id;
      var toilet = ctx.Amenities["Toilet"].Id;
      var entertainment = ctx.Amenities["Entertainment"].Id;

      var standard = ctx.BusCategories["Standard"].Id;
      var premium = ctx.BusCategories["Premium"].Id;
      var sleeperCat = ctx.BusCategories["Sleeper"].Id;

      ctx.Buses["GL-1"] = await AddBusAsync(db, ctx.GreenLine.Id, standard, "DHAKA-METRO-GHA-11-2233", "GL-C-101", "Scania", "K410IB", 2021, BusType.Ac, VehicleFuelType.Diesel, 9, 4, SeatType.Regular, true, true, new[] { wifi, ac, charging, toilet }, 0m);
      ctx.Buses["GL-2"] = await AddBusAsync(db, ctx.GreenLine.Id, premium, "DHAKA-METRO-GHA-12-4455", "GL-C-102", "Hino", "RN8J", 2020, BusType.BusinessClass, VehicleFuelType.Diesel, 8, 4, SeatType.Business, true, true, new[] { wifi, ac, charging, blanket, entertainment, toilet }, 100m);
      ctx.Buses["GL-3"] = await AddBusAsync(db, ctx.GreenLine.Id, sleeperCat, "DHAKA-METRO-GHA-13-6677", "GL-C-103", "Volvo", "B11R Sleeper", 2022, BusType.Sleeper, VehicleFuelType.Diesel, 14, 2, SeatType.Sleeper, true, true, new[] { wifi, ac, charging, blanket, readingLight, toilet }, 0m);

      ctx.Buses["ENA-1"] = await AddBusAsync(db, ctx.Ena.Id, standard, "DHAKA-METRO-CHA-21-1122", "ENA-C-201", "Ashok Leyland", "Viking", 2019, BusType.Ac, VehicleFuelType.Diesel, 10, 4, SeatType.Regular, true, false, new[] { ac, charging }, 0m);
      ctx.Buses["ENA-2"] = await AddBusAsync(db, ctx.Ena.Id, standard, "DHAKA-METRO-CHA-22-3344", "ENA-C-202", "Tata", "LP 1512", 2017, BusType.NonAc, VehicleFuelType.Diesel, 11, 4, SeatType.Regular, false, false, new[] { charging }, 0m);

      ctx.Buses["SHO-1"] = await AddBusAsync(db, ctx.Shohagh.Id, standard, "DHAKA-METRO-JA-31-5566", "SHO-C-301", "Scania", "K360IB", 2021, BusType.Ac, VehicleFuelType.Diesel, 9, 4, SeatType.Regular, true, true, new[] { wifi, ac, charging, toilet }, 0m);
      ctx.Buses["SHO-2"] = await AddBusAsync(db, ctx.Shohagh.Id, premium, "DHAKA-METRO-JA-32-7788", "SHO-C-302", "Hino", "AK1J", 2019, BusType.BusinessClass, VehicleFuelType.Diesel, 10, 3, SeatType.Business, true, true, new[] { wifi, ac, charging, entertainment }, 80m);

      ctx.Buses["HAN-1"] = await AddBusAsync(db, ctx.Hanif.Id, standard, "DHAKA-METRO-HA-41-9900", "HAN-C-401", "Scania", "K400IB", 2020, BusType.Ac, VehicleFuelType.Diesel, 9, 4, SeatType.Regular, true, true, new[] { wifi, ac, charging, toilet }, 0m);
      ctx.Buses["HAN-2"] = await AddBusAsync(db, ctx.Hanif.Id, sleeperCat, "DHAKA-METRO-HA-42-1011", "HAN-C-402", "Volvo", "B9R Sleeper", 2021, BusType.Sleeper, VehicleFuelType.Diesel, 14, 2, SeatType.Sleeper, true, true, new[] { wifi, ac, charging, blanket, toilet }, 0m);
    }

    // ================================================================================
    // 5. Staff (platform + per-operator), driver licenses, attendance, salaries
    // ================================================================================
    private static async Task<ApplicationUser> CreateUserAsync(
        UserManager<ApplicationUser> userManager, string userName, string email, string fullName, string role)
    {
      var user = new ApplicationUser
      {
        UserName = userName,
        Email = email,
        FullName = fullName,
        EmailConfirmed = true,
      };
      var result = await userManager.CreateAsync(user, DemoPassword);
      if (!result.Succeeded)
      {
        throw new InvalidOperationException(
            $"Failed to create demo user '{userName}': {string.Join("; ", result.Errors.Select(e => e.Description))}");
      }
      await userManager.AddToRoleAsync(user, role);
      return user;
    }

    private static async Task<StaffProfile> AddStaffAsync(
        AppDbContext db, UserManager<ApplicationUser> userManager, DemoContext ctx,
        string userName, string email, string fullName, Guid? busOperatorId, string employeeCode,
        StaffRole role, string? nationalId, DateOnly joiningDate)
    {
      var user = await CreateUserAsync(userManager, userName, email, fullName, "Staff");
      var profile = new StaffProfile
      {
        UserId = user.Id,
        BusOperatorId = busOperatorId,
        EmployeeCode = employeeCode,
        Role = role,
        NationalIdNumber = nationalId,
        JoiningDate = joiningDate,
        Address = "Dhaka, Bangladesh",
        IsActive = true,
      };
      db.StaffProfiles.Add(profile);
      await db.SaveChangesAsync();

      ctx.Staff[userName] = profile;
      ctx.StaffUsers[userName] = user;
      return profile;
    }

    private static async Task SeedStaffAsync(AppDbContext db, UserManager<ApplicationUser> userManager, DemoContext ctx)
    {
      // Platform staff - not attached to any single operator.
      await AddStaffAsync(db, userManager, ctx, "nusrat.finance", "nusrat.finance@ticketportal.local", "Nusrat Jahan", null, "PLT-EMP-001", StaffRole.Finance, "1990-1000234", new DateOnly(2022, 3, 14));
      await AddStaffAsync(db, userManager, ctx, "tanvir.ops", "tanvir.ops@ticketportal.local", "Tanvir Ahmed", null, "PLT-EMP-002", StaffRole.Manager, "1988-2000456", new DateOnly(2021, 7, 1));
      // RBAC Amendment v3: this persona was previously seeded as StaffRole.Manager,
      // which quietly granted it Manager's fleet/trip/cancellation-approval permissions
      // — Platform Support should only ever get PermissionMatrix's narrower Support set
      // (booking lookup + complaints). See ModelEnums.StaffRole.Support.
      await AddStaffAsync(db, userManager, ctx, "rezaul.support", "rezaul.support@ticketportal.local", "Rezaul Karim", null, "PLT-EMP-003", StaffRole.Support, "1992-3000789", new DateOnly(2023, 1, 10));

      // Green Line
      await AddStaffAsync(db, userManager, ctx, "abdul.karim.gl", "abdul.karim@greenline.com.bd", "Abdul Karim", ctx.GreenLine.Id, "GL-EMP-001", StaffRole.Manager, "1985-4000111", new DateOnly(2018, 5, 20));
      await AddStaffAsync(db, userManager, ctx, "hasan.driver.gl", "hasan.driver@greenline.com.bd", "Mohammad Hasan", ctx.GreenLine.Id, "GL-EMP-002", StaffRole.Driver, "1980-5000222", new DateOnly(2015, 2, 1));
      await AddStaffAsync(db, userManager, ctx, "jamal.helper.gl", "jamal.helper@greenline.com.bd", "Jamal Uddin", ctx.GreenLine.Id, "GL-EMP-003", StaffRole.Helper, "1995-6000333", new DateOnly(2020, 9, 15));
      await AddStaffAsync(db, userManager, ctx, "selina.counter.gl", "selina.counter@greenline.com.bd", "Selina Akter", ctx.GreenLine.Id, "GL-EMP-004", StaffRole.CounterStaff, "1993-7000444", new DateOnly(2021, 11, 1));
      await AddStaffAsync(db, userManager, ctx, "farida.counter.gl", "farida.counter@greenline.com.bd", "Farida Yasmin", ctx.GreenLine.Id, "GL-EMP-005", StaffRole.CounterStaff, "1991-8000555", new DateOnly(2022, 4, 18));

      // Ena Transport
      await AddStaffAsync(db, userManager, ctx, "kamal.driver.ena", "kamal.driver@enatransport.com.bd", "Kamal Hossain", ctx.Ena.Id, "ENA-EMP-001", StaffRole.Driver, "1982-9000666", new DateOnly(2016, 6, 10));
      await AddStaffAsync(db, userManager, ctx, "rafiqul.helper.ena", "rafiqul.helper@enatransport.com.bd", "Rafiqul Islam", ctx.Ena.Id, "ENA-EMP-002", StaffRole.Helper, "1994-1000777", new DateOnly(2019, 8, 5));
      await AddStaffAsync(db, userManager, ctx, "nasima.counter.ena", "nasima.counter@enatransport.com.bd", "Nasima Begum", ctx.Ena.Id, "ENA-EMP-003", StaffRole.CounterStaff, "1990-2000888", new DateOnly(2020, 12, 1));

      // Shohagh
      await AddStaffAsync(db, userManager, ctx, "shahin.driver.sho", "shahin.driver@shohagh.com.bd", "Shahin Alam", ctx.Shohagh.Id, "SHO-EMP-001", StaffRole.Driver, "1983-3000999", new DateOnly(2017, 3, 22));
      await AddStaffAsync(db, userManager, ctx, "delwar.supervisor.sho", "delwar.supervisor@shohagh.com.bd", "Delwar Hossain", ctx.Shohagh.Id, "SHO-EMP-002", StaffRole.Supervisor, "1987-4001100", new DateOnly(2019, 1, 15));
      await AddStaffAsync(db, userManager, ctx, "rina.counter.sho", "rina.counter@shohagh.com.bd", "Rina Akter", ctx.Shohagh.Id, "SHO-EMP-003", StaffRole.CounterStaff, "1996-5001211", new DateOnly(2022, 6, 1));

      // Hanif Enterprise - back office only; their own ERP handles counters and drivers.
      await AddStaffAsync(db, userManager, ctx, "iqbal.manager.han", "iqbal.manager@hanifenterprise.com.bd", "Iqbal Hossain", ctx.Hanif.Id, "HAN-EMP-001", StaffRole.Operator, "1986-6001322", new DateOnly(2023, 5, 1));

      db.DriverLicenses.AddRange(
          new DriverLicense { StaffProfileId = ctx.Staff["hasan.driver.gl"].Id, LicenseNumber = "DL-DHK-0093211", Type = LicenseType.Heavy, IssueDate = new DateOnly(2015, 1, 10), ExpiryDate = new DateOnly(2027, 1, 10) },
          new DriverLicense { StaffProfileId = ctx.Staff["kamal.driver.ena"].Id, LicenseNumber = "DL-DHK-0081422", Type = LicenseType.Heavy, IssueDate = new DateOnly(2016, 5, 3), ExpiryDate = new DateOnly(2026, 5, 3) },
          new DriverLicense { StaffProfileId = ctx.Staff["shahin.driver.sho"].Id, LicenseNumber = "DL-DHK-0075633", Type = LicenseType.Commercial, IssueDate = new DateOnly(2017, 2, 20), ExpiryDate = new DateOnly(2025, 12, 20) });

      var attendanceStaff = new[] { "abdul.karim.gl", "hasan.driver.gl", "kamal.driver.ena", "shahin.driver.sho", "selina.counter.gl" };
      foreach (var key in attendanceStaff)
      {
        var staff = ctx.Staff[key];
        for (var d = 1; d <= 3; d++)
        {
          db.StaffAttendances.Add(new StaffAttendance
          {
            StaffProfileId = staff.Id,
            AttendanceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-d)),
            Status = AttendanceStatus.Present,
          });
        }
      }
      db.StaffAttendances.Add(new StaffAttendance { StaffProfileId = ctx.Staff["rafiqul.helper.ena"].Id, AttendanceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)), Status = AttendanceStatus.Absent, Remarks = "No call, no show." });
      db.StaffAttendances.Add(new StaffAttendance { StaffProfileId = ctx.Staff["jamal.helper.gl"].Id, AttendanceDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), Status = AttendanceStatus.OnLeave, Remarks = "Approved sick leave." });

      var lastPeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
      var lastPeriodStart = lastPeriodEnd.AddDays(-29);
      var currentPeriodStart = lastPeriodEnd.AddDays(1);
      var currentPeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow);

      db.StaffSalaries.AddRange(
          new StaffSalary { StaffProfileId = ctx.Staff["abdul.karim.gl"].Id, PayPeriodStart = lastPeriodStart, PayPeriodEnd = lastPeriodEnd, Amount = 45000m, IsPaid = true, PaidAtUtc = DateTime.UtcNow.AddDays(-20), PaymentReference = "SAL-GL-0001" },
          new StaffSalary { StaffProfileId = ctx.Staff["abdul.karim.gl"].Id, PayPeriodStart = currentPeriodStart, PayPeriodEnd = currentPeriodEnd, Amount = 45000m, IsPaid = false },
          new StaffSalary { StaffProfileId = ctx.Staff["hasan.driver.gl"].Id, PayPeriodStart = currentPeriodStart, PayPeriodEnd = currentPeriodEnd, Amount = 28000m, IsPaid = false },
          new StaffSalary { StaffProfileId = ctx.Staff["kamal.driver.ena"].Id, PayPeriodStart = currentPeriodStart, PayPeriodEnd = currentPeriodEnd, Amount = 27000m, IsPaid = false });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 6. Agents and sales counters
    // ================================================================================
    private static async Task SeedAgentsAndCountersAsync(AppDbContext db, DemoContext ctx)
    {
      var bismillah = new Agent { BusOperatorId = null, Name = "Bismillah Travels", AgencyCode = "AGT-001", ContactPerson = "Md. Anisur Rahman", PhoneNumber = "+8801711000111", Email = "contact@bismillahtravels.com.bd", Address = "Fakirapool, Dhaka", CommissionPercentage = 5m, IsActive = true };
      var glPartner = new Agent { BusOperatorId = ctx.GreenLine.Id, Name = "Green Line Ticketing Partner", AgencyCode = "AGT-002", ContactPerson = "Shamsul Haque", PhoneNumber = "+8801711000222", Email = "shamsul@glpartner.com.bd", Address = "Paltan, Dhaka", CommissionPercentage = 4m, IsActive = true };
      var cityTravel = new Agent { BusOperatorId = null, Name = "City Travel Agency", AgencyCode = "AGT-003", ContactPerson = "Nurul Amin", PhoneNumber = "+8801711000333", Email = "info@citytravelbd.com", Address = "Motijheel, Dhaka", CommissionPercentage = 6m, IsActive = false };
      db.Agents.AddRange(bismillah, glPartner, cityTravel);
      await db.SaveChangesAsync();

      ctx.Agents["Bismillah"] = bismillah;
      ctx.Agents["GreenLinePartner"] = glPartner;
      ctx.Agents["CityTravel"] = cityTravel;

      var glBranchHead = await db.OperatorBranches.FirstAsync(b => b.BusOperatorId == ctx.GreenLine.Id && b.BranchName.Contains("Kolabagan"));
      var enaBranchHead = await db.OperatorBranches.FirstAsync(b => b.BusOperatorId == ctx.Ena.Id);
      var shoBranchHead = await db.OperatorBranches.FirstAsync(b => b.BusOperatorId == ctx.Shohagh.Id);

      var glCounter1 = new SalesCounter { BusOperatorId = ctx.GreenLine.Id, TerminalId = DbSeeder.DhakaGabtoliId, OperatorBranchId = glBranchHead.Id, CounterName = "Gabtoli Counter", CounterCode = "GL-CTR-01", PhoneNumber = "+8801811000111", Address = "Gabtoli Bus Terminal, Dhaka", IsActive = true };
      var glCounter2 = new SalesCounter { BusOperatorId = ctx.GreenLine.Id, TerminalId = DbSeeder.DhakaKalyanpurId, OperatorBranchId = glBranchHead.Id, CounterName = "Kalyanpur Counter", CounterCode = "GL-CTR-02", PhoneNumber = "+8801811000112", Address = "Kalyanpur Bus Stand, Dhaka", IsActive = true };
      var enaCounter1 = new SalesCounter { BusOperatorId = ctx.Ena.Id, TerminalId = DbSeeder.DhakaGabtoliId, OperatorBranchId = enaBranchHead.Id, CounterName = "Gabtoli Counter - Ena", CounterCode = "ENA-CTR-01", PhoneNumber = "+8801811000211", Address = "Gabtoli Bus Terminal, Dhaka", IsActive = true };
      var shoCounter1 = new SalesCounter { BusOperatorId = ctx.Shohagh.Id, TerminalId = DbSeeder.DhakaKalyanpurId, OperatorBranchId = shoBranchHead.Id, CounterName = "Kalyanpur Counter - Shohagh", CounterCode = "SHO-CTR-01", PhoneNumber = "+8801811000311", Address = "Kalyanpur Bus Stand, Dhaka", IsActive = true };

      db.SalesCounters.AddRange(glCounter1, glCounter2, enaCounter1, shoCounter1);
      await db.SaveChangesAsync();

      ctx.Counters["GL-Gabtoli"] = glCounter1;
      ctx.Counters["GL-Kalyanpur"] = glCounter2;
      ctx.Counters["ENA-Gabtoli"] = enaCounter1;
      ctx.Counters["SHO-Kalyanpur"] = shoCounter1;

      // RBAC Amendment v3 task 4: without an assignment row, CurrentActor.CanUseCounter
      // denies EVERY counter for a CounterStaff actor — these four rows are what let the
      // demo's four counter clerks actually sell, each restricted to their own named
      // counter (the exact case AUTH_TEST_CASES.md's "Green Line CounterStaff at Gabtoli
      // must not be able to sell from Kalyanpur" scenario exercises).
      db.StaffSalesCounterAssignments.AddRange(
          new StaffSalesCounterAssignment { StaffProfileId = ctx.Staff["selina.counter.gl"].Id, SalesCounterId = glCounter1.Id, IsActive = true },
          new StaffSalesCounterAssignment { StaffProfileId = ctx.Staff["farida.counter.gl"].Id, SalesCounterId = glCounter2.Id, IsActive = true },
          new StaffSalesCounterAssignment { StaffProfileId = ctx.Staff["nasima.counter.ena"].Id, SalesCounterId = enaCounter1.Id, IsActive = true },
          new StaffSalesCounterAssignment { StaffProfileId = ctx.Staff["rina.counter.sho"].Id, SalesCounterId = shoCounter1.Id, IsActive = true });
      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 7. Customers
    // ================================================================================
    private static async Task AddCustomerAsync(
        AppDbContext db, UserManager<ApplicationUser> userManager, DemoContext ctx,
        string userName, string email, string fullName, string dob, Gender gender, string nationalId, string preferredLanguage)
    {
      var user = await CreateUserAsync(userManager, userName, email, fullName, "Customer");
      var profile = new CustomerProfile
      {
        UserId = user.Id,
        NationalIdNumber = nationalId,
        DateOfBirth = DateOnly.Parse(dob),
        Gender = gender,
        PreferredLanguageCode = preferredLanguage,
      };
      db.CustomerProfiles.Add(profile);
      await db.SaveChangesAsync();

      ctx.Customers[userName] = profile;
      ctx.CustomerUsers[userName] = user;
    }

    private static async Task SeedCustomersAsync(AppDbContext db, UserManager<ApplicationUser> userManager, DemoContext ctx)
    {
      await AddCustomerAsync(db, userManager, ctx, "rahim.uddin", "rahim.uddin@example.com", "Rahim Uddin", "1990-01-15", Gender.Male, "1912345678901", "en");
      await AddCustomerAsync(db, userManager, ctx, "karim.sheikh", "karim.sheikh@example.com", "Karim Sheikh", "1988-06-22", Gender.Male, "1988765432101", "bn");
      await AddCustomerAsync(db, userManager, ctx, "fatema.begum", "fatema.begum@example.com", "Fatema Begum", "1995-03-10", Gender.Female, "1995123456789", "bn");
      await AddCustomerAsync(db, userManager, ctx, "nasrin.sultana", "nasrin.sultana@example.com", "Nasrin Sultana", "1992-11-05", Gender.Female, "1992765432198", "en");
      await AddCustomerAsync(db, userManager, ctx, "jashim.uddin", "jashim.uddin@example.com", "Jashim Uddin", "1985-09-18", Gender.Male, "1985345678912", "en");
      await AddCustomerAsync(db, userManager, ctx, "shirin.akter", "shirin.akter@example.com", "Shirin Akter", "1998-07-30", Gender.Female, "1998456789123", "bn");
      await AddCustomerAsync(db, userManager, ctx, "mitu.rahman", "mitu.rahman@example.com", "Mitu Rahman", "1993-12-25", Gender.Female, "1993987654321", "en");

      db.CustomerAddresses.AddRange(
          new CustomerAddress { CustomerProfileId = ctx.Customers["rahim.uddin"].Id, Label = "Home", AddressLine = "House 12, Road 7, Dhanmondi", City = "Dhaka", District = "Dhaka", IsDefault = true },
          new CustomerAddress { CustomerProfileId = ctx.Customers["karim.sheikh"].Id, Label = "Home", AddressLine = "Flat 4B, Road 11, Banani", City = "Dhaka", District = "Dhaka", IsDefault = true },
          new CustomerAddress { CustomerProfileId = ctx.Customers["fatema.begum"].Id, Label = "Home", AddressLine = "Village Bashail, Tangail Sadar", City = "Tangail", District = "Tangail", IsDefault = true },
          new CustomerAddress { CustomerProfileId = ctx.Customers["nasrin.sultana"].Id, Label = "Office", AddressLine = "Level 6, Bashundhara City, Panthapath", City = "Dhaka", District = "Dhaka", IsDefault = true },
          new CustomerAddress { CustomerProfileId = ctx.Customers["jashim.uddin"].Id, Label = "Home", AddressLine = "Chandgaon, Chittagong", City = "Chittagong", District = "Chittagong", IsDefault = true },
          new CustomerAddress { CustomerProfileId = ctx.Customers["mitu.rahman"].Id, Label = "Home", AddressLine = "Zindabazar, Sylhet", City = "Sylhet", District = "Sylhet", IsDefault = true });

      db.EmergencyContacts.AddRange(
          new EmergencyContact { CustomerProfileId = ctx.Customers["rahim.uddin"].Id, Name = "Abdur Rahman", Phone = "+8801911000001", Relation = "Father" },
          new EmergencyContact { CustomerProfileId = ctx.Customers["fatema.begum"].Id, Name = "Abul Kalam", Phone = "+8801911000002", Relation = "Husband" },
          new EmergencyContact { CustomerProfileId = ctx.Customers["nasrin.sultana"].Id, Name = "Nazma Khatun", Phone = "+8801911000003", Relation = "Mother" },
          new EmergencyContact { CustomerProfileId = ctx.Customers["shirin.akter"].Id, Name = "Kamrul Hasan", Phone = "+8801911000004", Relation = "Brother" });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 8. Operator routes (+ route stops on both the shared route and the operator route)
    // ================================================================================
    private static async Task SeedOperatorRoutesAsync(AppDbContext db, DemoContext ctx)
    {
      var dhkCtg = DbSeeder.DhakaToChittagongRouteId;
      var ctgDhk = DbSeeder.ChittagongToDhakaRouteId;
      var dhkSyl = DbSeeder.DhakaToSylhetRouteId;
      var dhkCxb = DbSeeder.DhakaToCoxsBazarRouteId;

      var glR1 = new OperatorRoute { BusOperatorId = ctx.GreenLine.Id, BusRouteId = dhkCtg, OperatorRouteCode = "GL-RT-DHKCTG", DisplayName = "Green Line Dhaka - Chittagong", IsActive = true };
      var glR2 = new OperatorRoute { BusOperatorId = ctx.GreenLine.Id, BusRouteId = ctgDhk, OperatorRouteCode = "GL-RT-CTGDHK", DisplayName = "Green Line Chittagong - Dhaka", IsActive = true };
      var glR3 = new OperatorRoute { BusOperatorId = ctx.GreenLine.Id, BusRouteId = dhkSyl, OperatorRouteCode = "GL-RT-DHKSYL", DisplayName = "Green Line Dhaka - Sylhet", IsActive = true };

      var enaR1 = new OperatorRoute { BusOperatorId = ctx.Ena.Id, BusRouteId = dhkCtg, OperatorRouteCode = "ENA-RT-DHKCTG", DisplayName = "Ena Dhaka - Chittagong", IsActive = true };
      var enaR2 = new OperatorRoute { BusOperatorId = ctx.Ena.Id, BusRouteId = dhkCxb, OperatorRouteCode = "ENA-RT-DHKCXB", DisplayName = "Ena Dhaka - Cox's Bazar", IsActive = true };

      var shoR1 = new OperatorRoute { BusOperatorId = ctx.Shohagh.Id, BusRouteId = dhkSyl, OperatorRouteCode = "SHO-RT-DHKSYL", DisplayName = "Shohagh Dhaka - Sylhet", IsActive = true };
      var shoR2 = new OperatorRoute { BusOperatorId = ctx.Shohagh.Id, BusRouteId = dhkCxb, OperatorRouteCode = "SHO-RT-DHKCXB", DisplayName = "Shohagh Dhaka - Cox's Bazar", IsActive = true };

      var hanR1 = new OperatorRoute { BusOperatorId = ctx.Hanif.Id, BusRouteId = dhkCtg, OperatorRouteCode = "HAN-RT-DHKCTG", DisplayName = "Hanif Dhaka - Chittagong", IsActive = true };
      var hanR2 = new OperatorRoute { BusOperatorId = ctx.Hanif.Id, BusRouteId = ctgDhk, OperatorRouteCode = "HAN-RT-CTGDHK", DisplayName = "Hanif Chittagong - Dhaka", IsActive = true };

      db.OperatorRoutes.AddRange(glR1, glR2, glR3, enaR1, enaR2, shoR1, shoR2, hanR1, hanR2);

      void AddOperatorStops(OperatorRoute route, Guid originTerminalId, Guid destTerminalId)
      {
        db.OperatorRouteStops.AddRange(
            new OperatorRouteStop { OperatorRouteId = route.Id, TerminalId = originTerminalId, StopOrder = 1, IsPickupPoint = true, IsDropOffPoint = false },
            new OperatorRouteStop { OperatorRouteId = route.Id, TerminalId = destTerminalId, StopOrder = 2, IsPickupPoint = false, IsDropOffPoint = true });
      }

      AddOperatorStops(glR1, DbSeeder.DhakaGabtoliId, DbSeeder.ChittagongCentralId);
      AddOperatorStops(glR2, DbSeeder.ChittagongCentralId, DbSeeder.DhakaGabtoliId);
      AddOperatorStops(glR3, DbSeeder.DhakaKalyanpurId, DbSeeder.SylhetKadamtaliId);
      AddOperatorStops(enaR1, DbSeeder.DhakaGabtoliId, DbSeeder.ChittagongCentralId);
      AddOperatorStops(enaR2, DbSeeder.DhakaGabtoliId, DbSeeder.CoxsBazarId);
      AddOperatorStops(shoR1, DbSeeder.DhakaKalyanpurId, DbSeeder.SylhetKadamtaliId);
      AddOperatorStops(shoR2, DbSeeder.DhakaGabtoliId, DbSeeder.CoxsBazarId);
      AddOperatorStops(hanR1, DbSeeder.DhakaGabtoliId, DbSeeder.ChittagongCentralId);
      AddOperatorStops(hanR2, DbSeeder.ChittagongCentralId, DbSeeder.DhakaGabtoliId);

      // The shared BusRoute rows didn't get any RouteStops from DbSeeder - add origin +
      // destination here so RouteStopsController has something to show too.
      db.RouteStops.AddRange(
          new RouteStop { BusRouteId = dhkCtg, TerminalId = DbSeeder.DhakaGabtoliId, StopOrder = 1, DistanceFromOriginKm = 0, IsPickupPoint = true, IsDropOffPoint = false },
          new RouteStop { BusRouteId = dhkCtg, TerminalId = DbSeeder.ChittagongCentralId, StopOrder = 2, DistanceFromOriginKm = 264, ArrivalOffsetMinutes = 360, IsPickupPoint = false, IsDropOffPoint = true },
          new RouteStop { BusRouteId = ctgDhk, TerminalId = DbSeeder.ChittagongCentralId, StopOrder = 1, DistanceFromOriginKm = 0, IsPickupPoint = true, IsDropOffPoint = false },
          new RouteStop { BusRouteId = ctgDhk, TerminalId = DbSeeder.DhakaGabtoliId, StopOrder = 2, DistanceFromOriginKm = 264, ArrivalOffsetMinutes = 360, IsPickupPoint = false, IsDropOffPoint = true },
          new RouteStop { BusRouteId = dhkSyl, TerminalId = DbSeeder.DhakaKalyanpurId, StopOrder = 1, DistanceFromOriginKm = 0, IsPickupPoint = true, IsDropOffPoint = false },
          new RouteStop { BusRouteId = dhkSyl, TerminalId = DbSeeder.SylhetKadamtaliId, StopOrder = 2, DistanceFromOriginKm = 247, ArrivalOffsetMinutes = 330, IsPickupPoint = false, IsDropOffPoint = true },
          new RouteStop { BusRouteId = dhkCxb, TerminalId = DbSeeder.DhakaGabtoliId, StopOrder = 1, DistanceFromOriginKm = 0, IsPickupPoint = true, IsDropOffPoint = false },
          new RouteStop { BusRouteId = dhkCxb, TerminalId = DbSeeder.CoxsBazarId, StopOrder = 2, DistanceFromOriginKm = 414, ArrivalOffsetMinutes = 540, IsPickupPoint = false, IsDropOffPoint = true });

      await db.SaveChangesAsync();

      ctx.OperatorRoutes["GL-DhkCtg"] = glR1;
      ctx.OperatorRoutes["GL-CtgDhk"] = glR2;
      ctx.OperatorRoutes["GL-DhkSyl"] = glR3;
      ctx.OperatorRoutes["ENA-DhkCtg"] = enaR1;
      ctx.OperatorRoutes["ENA-DhkCxb"] = enaR2;
      ctx.OperatorRoutes["SHO-DhkSyl"] = shoR1;
      ctx.OperatorRoutes["SHO-DhkCxb"] = shoR2;
      ctx.OperatorRoutes["HAN-DhkCtg"] = hanR1;
      ctx.OperatorRoutes["HAN-CtgDhk"] = hanR2;
    }

    // ================================================================================
    // 9. Hanif's ERP integration (the ExternalApiManaged operator)
    // ================================================================================
    // Chunk 8 task 3: BaseUrl and SecretReference are no longer hardcoded fictional values —
    // BaseUrl points at apps/mock-erp by default (see docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md
    // for how to run it), overridable via Integrations:HanifErpBaseUrl for anyone pointing
    // this at a real server instead. SecretReference is "env:HANIF_ERP_API_KEY" — a POINTER
    // the sync engine resolves at call time (see ExternalBookingSyncService.ResolveSecret),
    // never a literal secret value sitting in seeded demo data. appsettings.Development.json
    // sets a matching demo default so a fresh clone works out of the box; override the
    // HANIF_ERP_API_KEY environment variable for anything beyond local demo use.
    private static async Task SeedHanifIntegrationAsync(AppDbContext db, DemoContext ctx, IConfiguration configuration)
    {
      var baseUrl = configuration["Integrations:HanifErpBaseUrl"];
      if (string.IsNullOrWhiteSpace(baseUrl))
      {
        baseUrl = "http://localhost:5099/api/v1";
      }

      var integration = new OperatorIntegration
      {
        BusOperatorId = ctx.Hanif.Id,
        Name = "Hanif ERP Connect",
        BaseUrl = baseUrl,
        AuthType = IntegrationAuthType.ApiKey,
        ApiKeyHeaderName = "X-API-Key",
        SecretReference = "env:HANIF_ERP_API_KEY",
        TimeoutSeconds = 30,
        IsActive = true,
        LastSuccessfulSyncAtUtc = DateTime.UtcNow.AddHours(-6),
      };
      db.OperatorIntegrations.Add(integration);
      await db.SaveChangesAsync();
      ctx.HanifIntegration = integration;

      db.OperatorIntegrationEndpoints.AddRange(
          new OperatorIntegrationEndpoint { OperatorIntegrationId = integration.Id, Purpose = "GetSeatAvailability", HttpMethod = "GET", PathTemplate = "/trips/{tripId}/seats", IsActive = true },
          new OperatorIntegrationEndpoint { OperatorIntegrationId = integration.Id, Purpose = "ConfirmBooking", HttpMethod = "POST", PathTemplate = "/bookings/confirm", IsActive = true },
          new OperatorIntegrationEndpoint { OperatorIntegrationId = integration.Id, Purpose = "GetBookingStatus", HttpMethod = "GET", PathTemplate = "/bookings/{bookingId}/status", IsActive = true },
          new OperatorIntegrationEndpoint { OperatorIntegrationId = integration.Id, Purpose = "CancelBooking", HttpMethod = "POST", PathTemplate = "/bookings/{bookingId}/cancel", IsActive = true });

      db.ExternalRouteMappings.AddRange(
          new ExternalRouteMapping { OperatorIntegrationId = integration.Id, OperatorRouteId = ctx.OperatorRoutes["HAN-DhkCtg"].Id, ExternalRouteKey = "HAN-RT-1001", ExternalRouteName = "Dhaka-Chattogram Express" },
          new ExternalRouteMapping { OperatorIntegrationId = integration.Id, OperatorRouteId = ctx.OperatorRoutes["HAN-CtgDhk"].Id, ExternalRouteKey = "HAN-RT-1002", ExternalRouteName = "Chattogram-Dhaka Express" });

      db.IntegrationSyncLogs.Add(new IntegrationSyncLog
      {
        OperatorIntegrationId = integration.Id,
        EntityName = "Route",
        EntityKey = "HAN-RT-1001",
        Operation = "GetSeatAvailability",
        Status = IntegrationSyncStatus.Succeeded,
        StartedAtUtc = DateTime.UtcNow.AddHours(-6),
        CompletedAtUtc = DateTime.UtcNow.AddHours(-6).AddSeconds(2),
        ResponseJson = "{\"availableSeats\":36}",
      });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 10. Schedules & trips (past/completed, future/scheduled, one cancelled)
    // ================================================================================
    private static DateTime At(int daysOffset, int hour, int minute = 0) =>
        DateTime.UtcNow.Date.AddDays(daysOffset).AddHours(hour).AddMinutes(minute);

    private static async Task<Schedule> AddScheduleAsync(
        AppDbContext db, BusOperator op, OperatorRoute opRoute, Bus bus, string code,
        TimeSpan departureTimeOfDay, TimeSpan? arrivalTimeOfDay, decimal baseFare)
    {
      var schedule = new Schedule
      {
        BusOperatorId = op.Id,
        BusRouteId = opRoute.BusRouteId,
        OperatorRouteId = opRoute.Id,
        BusId = bus.Id,
        ScheduleCode = code,
        DepartureTimeOfDay = departureTimeOfDay,
        ArrivalTimeOfDay = arrivalTimeOfDay,
        OperatingDays = DayOfWeekFlag.Everyday,
        EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6)),
        BaseFare = baseFare,
        Currency = "BDT",
        IsActive = true,
      };
      db.Schedules.Add(schedule);
      await db.SaveChangesAsync();
      return schedule;
    }

    private static async Task<Trip> AddTripAsync(
        AppDbContext db, BusOperator op, OperatorRoute opRoute, Bus bus, Schedule? schedule,
        Guid departureTerminalId, Guid arrivalTerminalId, DateTime departureUtc, int durationMinutes,
        decimal baseFare, TripStatus status, string tripCode, Guid? cancellationPolicyId = null)
    {
      var seats = await db.Seats.Where(s => s.BusId == bus.Id).ToListAsync();

      var trip = new Trip
      {
        BusOperatorId = op.Id,
        BusRouteId = opRoute.BusRouteId,
        OperatorRouteId = opRoute.Id,
        BusId = bus.Id,
        ScheduleId = schedule?.Id,
        DepartureTerminalId = departureTerminalId,
        ArrivalTerminalId = arrivalTerminalId,
        CancellationPolicyId = cancellationPolicyId,
        TripCode = tripCode,
        InventoryMode = op.InventoryMode,
        DepartureTimeUtc = departureUtc,
        ArrivalTimeUtc = departureUtc.AddMinutes(durationMinutes),
        ReportingTimeUtc = departureUtc.AddMinutes(-30),
        Status = status,
        IsWheelchairAccessible = bus.BusType != BusType.NonAc,
        BaseFare = baseFare,
        Currency = "BDT",
        CoverImageUrl = $"https://picsum.photos/seed/{tripCode}/640/360",
      };

      if (status == TripStatus.Completed)
      {
        trip.ActualDepartureTimeUtc = departureUtc.AddMinutes(6);
        trip.ActualArrivalTimeUtc = trip.ArrivalTimeUtc.AddMinutes(15);
      }

      db.Trips.Add(trip);

      var seatStatus = status == TripStatus.Cancelled ? TripSeatStatus.Blocked : TripSeatStatus.Available;
      foreach (var seat in seats)
      {
        db.TripSeats.Add(new TripSeat
        {
          TripId = trip.Id,
          SeatId = seat.Id,
          SeatNumber = seat.SeatNumber,
          SeatType = seat.SeatType,
          Fare = baseFare + (seat.ExtraFare ?? 0m),
          Status = seatStatus,
          BlockReason = status == TripStatus.Cancelled ? "Trip cancelled by operator." : null,
        });
      }

      db.TripStatusHistories.Add(new TripStatusHistory
      {
        TripId = trip.Id,
        Status = TripStatus.Scheduled,
        ChangedAtUtc = trip.CreatedAtUtc,
        Remarks = "Trip created.",
      });

      if (status == TripStatus.Completed)
      {
        db.TripStatusHistories.Add(new TripStatusHistory { TripId = trip.Id, Status = TripStatus.Departed, ChangedAtUtc = trip.ActualDepartureTimeUtc!.Value, Remarks = "Departed on time." });
        db.TripStatusHistories.Add(new TripStatusHistory { TripId = trip.Id, Status = TripStatus.Completed, ChangedAtUtc = trip.ActualArrivalTimeUtc!.Value, Remarks = "Trip completed successfully." });
      }
      else if (status == TripStatus.Cancelled)
      {
        db.TripStatusHistories.Add(new TripStatusHistory { TripId = trip.Id, Status = TripStatus.Cancelled, ChangedAtUtc = DateTime.UtcNow.AddHours(-2), Remarks = "Cancelled due to a vehicle breakdown; passengers notified." });
      }

      await db.SaveChangesAsync();
      return trip;
    }

    private static async Task SeedSchedulesAndTripsAsync(AppDbContext db, DemoContext ctx)
    {
      var gabtoli = DbSeeder.DhakaGabtoliId;
      var kalyanpur = DbSeeder.DhakaKalyanpurId;
      var ctgCentral = DbSeeder.ChittagongCentralId;
      var sylhet = DbSeeder.SylhetKadamtaliId;
      var coxsBazar = DbSeeder.CoxsBazarId;

      // --- Green Line ---
      var glSch1 = await AddScheduleAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkCtg"], ctx.Buses["GL-1"], "GL-SCH-DHKCTG-0800", new TimeSpan(8, 0, 0), new TimeSpan(14, 0, 0), 550m);
      ctx.Trips["GL-1"] = await AddTripAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkCtg"], ctx.Buses["GL-1"], glSch1, gabtoli, ctgCentral, At(-3, 8), 360, 550m, TripStatus.Completed, "GL-TRP-1001");
      ctx.Trips["GL-2"] = await AddTripAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkCtg"], ctx.Buses["GL-1"], glSch1, gabtoli, ctgCentral, At(1, 8), 360, 550m, TripStatus.Scheduled, "GL-TRP-1002");

      var glSch2 = await AddScheduleAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkCtg"], ctx.Buses["GL-2"], "GL-SCH-DHKCTG-1400", new TimeSpan(14, 0, 0), new TimeSpan(20, 0, 0), 650m);
      ctx.Trips["GL-3"] = await AddTripAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkCtg"], ctx.Buses["GL-2"], glSch2, gabtoli, ctgCentral, At(5, 14), 360, 650m, TripStatus.Scheduled, "GL-TRP-1003");

      var glSch3 = await AddScheduleAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-CtgDhk"], ctx.Buses["GL-1"], "GL-SCH-CTGDHK-0900", new TimeSpan(9, 0, 0), new TimeSpan(15, 0, 0), 550m);
      ctx.Trips["GL-4"] = await AddTripAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-CtgDhk"], ctx.Buses["GL-1"], glSch3, ctgCentral, gabtoli, At(2, 9), 360, 550m, TripStatus.Scheduled, "GL-TRP-1004");

      var glSch4 = await AddScheduleAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkSyl"], ctx.Buses["GL-3"], "GL-SCH-DHKSYL-0600", new TimeSpan(6, 0, 0), new TimeSpan(11, 30, 0), 500m);
      ctx.Trips["GL-5"] = await AddTripAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkSyl"], ctx.Buses["GL-3"], glSch4, kalyanpur, sylhet, At(1, 6), 330, 500m, TripStatus.Scheduled, "GL-TRP-1005");
      ctx.Trips["GL-6"] = await AddTripAsync(db, ctx.GreenLine, ctx.OperatorRoutes["GL-DhkSyl"], ctx.Buses["GL-3"], glSch4, kalyanpur, sylhet, At(6, 10), 330, 500m, TripStatus.Cancelled, "GL-TRP-1006");

      // --- Ena Transport ---
      var enaSch1 = await AddScheduleAsync(db, ctx.Ena, ctx.OperatorRoutes["ENA-DhkCtg"], ctx.Buses["ENA-1"], "ENA-SCH-DHKCTG-0730", new TimeSpan(7, 30, 0), new TimeSpan(13, 30, 0), 480m);
      ctx.Trips["ENA-1"] = await AddTripAsync(db, ctx.Ena, ctx.OperatorRoutes["ENA-DhkCtg"], ctx.Buses["ENA-1"], enaSch1, gabtoli, ctgCentral, At(2, 7, 30), 360, 480m, TripStatus.Scheduled, "ENA-TRP-2001");

      var enaSch2 = await AddScheduleAsync(db, ctx.Ena, ctx.OperatorRoutes["ENA-DhkCxb"], ctx.Buses["ENA-2"], "ENA-SCH-DHKCXB-1100", new TimeSpan(11, 0, 0), new TimeSpan(20, 0, 0), 850m);
      ctx.Trips["ENA-2"] = await AddTripAsync(db, ctx.Ena, ctx.OperatorRoutes["ENA-DhkCxb"], ctx.Buses["ENA-2"], enaSch2, gabtoli, coxsBazar, At(3, 11), 540, 850m, TripStatus.Scheduled, "ENA-TRP-2002");
      ctx.Trips["ENA-3"] = await AddTripAsync(db, ctx.Ena, ctx.OperatorRoutes["ENA-DhkCxb"], ctx.Buses["ENA-2"], enaSch2, gabtoli, coxsBazar, At(-2, 9), 540, 850m, TripStatus.Completed, "ENA-TRP-2003");

      // --- Shohagh ---
      var shoSch1 = await AddScheduleAsync(db, ctx.Shohagh, ctx.OperatorRoutes["SHO-DhkSyl"], ctx.Buses["SHO-1"], "SHO-SCH-DHKSYL-1500", new TimeSpan(15, 0, 0), new TimeSpan(20, 30, 0), 520m);
      ctx.Trips["SHO-1"] = await AddTripAsync(db, ctx.Shohagh, ctx.OperatorRoutes["SHO-DhkSyl"], ctx.Buses["SHO-1"], shoSch1, kalyanpur, sylhet, At(2, 15), 330, 520m, TripStatus.Scheduled, "SHO-TRP-3001");

      var shoSch2 = await AddScheduleAsync(db, ctx.Shohagh, ctx.OperatorRoutes["SHO-DhkCxb"], ctx.Buses["SHO-2"], "SHO-SCH-DHKCXB-0800", new TimeSpan(8, 0, 0), new TimeSpan(17, 0, 0), 700m);
      ctx.Trips["SHO-2"] = await AddTripAsync(db, ctx.Shohagh, ctx.OperatorRoutes["SHO-DhkCxb"], ctx.Buses["SHO-2"], shoSch2, gabtoli, coxsBazar, At(10, 8), 540, 700m, TripStatus.Scheduled, "SHO-TRP-3002", ctx.CancellationPolicies["ShohaghPromo"].Id);

      // --- Hanif Enterprise (ExternalApiManaged) ---
      var hanSch1 = await AddScheduleAsync(db, ctx.Hanif, ctx.OperatorRoutes["HAN-DhkCtg"], ctx.Buses["HAN-1"], "HAN-SCH-DHKCTG-2100", new TimeSpan(21, 0, 0), new TimeSpan(3, 0, 0), 600m);
      ctx.Trips["HAN-1"] = await AddTripAsync(db, ctx.Hanif, ctx.OperatorRoutes["HAN-DhkCtg"], ctx.Buses["HAN-1"], hanSch1, gabtoli, ctgCentral, At(3, 21), 360, 600m, TripStatus.Scheduled, "HAN-TRP-4001");

      var hanSch2 = await AddScheduleAsync(db, ctx.Hanif, ctx.OperatorRoutes["HAN-CtgDhk"], ctx.Buses["HAN-2"], "HAN-SCH-CTGDHK-2200", new TimeSpan(22, 0, 0), new TimeSpan(4, 0, 0), 700m);
      ctx.Trips["HAN-2"] = await AddTripAsync(db, ctx.Hanif, ctx.OperatorRoutes["HAN-CtgDhk"], ctx.Buses["HAN-2"], hanSch2, ctgCentral, gabtoli, At(5, 22), 360, 700m, TripStatus.Scheduled, "HAN-TRP-4002");

      // Crew assignments - Green Line, Ena, Shohagh only; Hanif's own ERP manages crew.
      void AssignCrew(Trip trip, string driverKey, string? helperKey)
      {
        db.TripCrews.Add(new TripCrew { TripId = trip.Id, StaffProfileId = ctx.Staff[driverKey].Id, Role = CrewRole.Driver });
        if (helperKey != null)
        {
          db.TripCrews.Add(new TripCrew { TripId = trip.Id, StaffProfileId = ctx.Staff[helperKey].Id, Role = CrewRole.Helper });
        }
      }

      AssignCrew(ctx.Trips["GL-1"], "hasan.driver.gl", "jamal.helper.gl");
      AssignCrew(ctx.Trips["GL-2"], "hasan.driver.gl", "jamal.helper.gl");
      AssignCrew(ctx.Trips["GL-3"], "hasan.driver.gl", null);
      AssignCrew(ctx.Trips["GL-4"], "hasan.driver.gl", "jamal.helper.gl");
      AssignCrew(ctx.Trips["GL-5"], "hasan.driver.gl", null);
      AssignCrew(ctx.Trips["ENA-1"], "kamal.driver.ena", "rafiqul.helper.ena");
      AssignCrew(ctx.Trips["ENA-2"], "kamal.driver.ena", "rafiqul.helper.ena");
      AssignCrew(ctx.Trips["ENA-3"], "kamal.driver.ena", "rafiqul.helper.ena");
      AssignCrew(ctx.Trips["SHO-1"], "shahin.driver.sho", null);
      AssignCrew(ctx.Trips["SHO-2"], "shahin.driver.sho", null);

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 11. Coupons
    // ================================================================================
    private static async Task SeedCouponsAsync(AppDbContext db, DemoContext ctx)
    {
      var welcome100 = new Coupon
      {
        Code = "WELCOME100",
        Description = "৳100 off your first booking.",
        Type = CouponType.FixedAmount,
        DiscountAmount = 100m,
        MinBookingAmount = 300m,
        UsageLimit = 500,
        PerUserLimit = 1,
        ValidFromUtc = DateTime.UtcNow.AddMonths(-2),
        ValidToUtc = DateTime.UtcNow.AddMonths(4),
        IsActive = true,
      };
      var eid20 = new Coupon
      {
        Code = "EID20",
        Description = "20% off for Eid travel, up to ৳300.",
        Type = CouponType.Percentage,
        DiscountPercentage = 20m,
        MaxDiscountAmount = 300m,
        MinBookingAmount = 500m,
        UsageLimit = 1000,
        PerUserLimit = 2,
        ValidFromUtc = DateTime.UtcNow.AddMonths(-1),
        ValidToUtc = DateTime.UtcNow.AddMonths(2),
        IsActive = true,
      };
      var expired10 = new Coupon
      {
        Code = "EXPIRED10",
        Description = "10% off - past promotion, kept for reference.",
        Type = CouponType.Percentage,
        DiscountPercentage = 10m,
        MaxDiscountAmount = 150m,
        UsageLimit = 200,
        PerUserLimit = 1,
        ValidFromUtc = DateTime.UtcNow.AddMonths(-6),
        ValidToUtc = DateTime.UtcNow.AddMonths(-3),
        IsActive = true,
      };
      var weekend50 = new Coupon
      {
        Code = "WEEKEND50",
        Description = "৳50 off weekend trips - currently disabled.",
        Type = CouponType.FixedAmount,
        DiscountAmount = 50m,
        MinBookingAmount = 200m,
        UsageLimit = 300,
        PerUserLimit = 3,
        ValidFromUtc = DateTime.UtcNow.AddMonths(-3),
        ValidToUtc = DateTime.UtcNow.AddMonths(3),
        IsActive = false,
      };

      db.Coupons.AddRange(welcome100, eid20, expired10, weekend50);
      await db.SaveChangesAsync();

      ctx.Coupons["WELCOME100"] = welcome100;
      ctx.Coupons["EID20"] = eid20;
      ctx.Coupons["EXPIRED10"] = expired10;
      ctx.Coupons["WEEKEND50"] = weekend50;
    }

    // ================================================================================
    // 12. Offers & promo banners
    // ================================================================================
    private static async Task SeedOffersAndBannersAsync(AppDbContext db, DemoContext ctx)
    {
      db.Offers.AddRange(
          new Offer { BusOperatorId = null, Title = "Eid-ul-Fitr Special - Up to 20% Off", Description = "Book your Eid travel early and save with code EID20.", Status = OfferStatus.Active, StartDateUtc = DateTime.UtcNow.AddDays(-10), EndDateUtc = DateTime.UtcNow.AddDays(20) },
          new Offer { BusOperatorId = ctx.GreenLine.Id, Title = "Green Line Weekday Saver", Description = "Extra savings on Green Line's Sunday-Wednesday departures.", Status = OfferStatus.Active, StartDateUtc = DateTime.UtcNow.AddDays(-5), EndDateUtc = DateTime.UtcNow.AddDays(45) },
          new Offer { BusOperatorId = null, Title = "Winter Fare Discount", Description = "Season discount on all long-haul routes.", Status = OfferStatus.Expired, StartDateUtc = DateTime.UtcNow.AddMonths(-4), EndDateUtc = DateTime.UtcNow.AddMonths(-2) },
          new Offer { BusOperatorId = ctx.Shohagh.Id, Title = "Shohagh Summer Promo", Description = "Discounted promo fares on the Dhaka - Cox's Bazar route.", Status = OfferStatus.Disabled, StartDateUtc = DateTime.UtcNow.AddDays(-20), EndDateUtc = DateTime.UtcNow.AddDays(40) });

      db.PromoBanners.AddRange(
          new PromoBanner { ImageUrl = "https://picsum.photos/seed/promo-eid-banner/1200/400", LinkUrl = "/offers/eid-special", IsActive = true, DisplayOrder = 1 },
          new PromoBanner { ImageUrl = "https://picsum.photos/seed/promo-app-banner/1200/400", LinkUrl = "/download-app", IsActive = true, DisplayOrder = 2 },
          new PromoBanner { ImageUrl = "https://picsum.photos/seed/promo-winter-banner/1200/400", LinkUrl = "/offers/winter-discount", IsActive = false, DisplayOrder = 3 });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 13. Fare rules (reference data; not consumed by the booking flow itself)
    // ================================================================================
    private static async Task SeedFareRulesAsync(AppDbContext db, DemoContext ctx)
    {
      db.FareRules.AddRange(
          new FareRule { BusOperatorId = null, BusRouteId = DbSeeder.DhakaToChittagongRouteId, BaseFare = 550m, EffectiveFromUtc = DateTime.UtcNow.AddYears(-1), IsActive = true },
          new FareRule { BusOperatorId = null, BusRouteId = DbSeeder.DhakaToSylhetRouteId, BaseFare = 500m, EffectiveFromUtc = DateTime.UtcNow.AddYears(-1), IsActive = true },
          new FareRule { BusOperatorId = null, BusRouteId = DbSeeder.DhakaToCoxsBazarRouteId, BaseFare = 850m, EffectiveFromUtc = DateTime.UtcNow.AddYears(-1), IsActive = true },
          new FareRule { BusOperatorId = ctx.GreenLine.Id, BusRouteId = DbSeeder.DhakaToChittagongRouteId, SeatType = SeatType.Business, BaseFare = 650m, EffectiveFromUtc = DateTime.UtcNow.AddMonths(-6), IsActive = true });
      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 14. Booking scenarios - driven through the real services so every downstream
    //     ledger/wallet/ticket effect is exactly what the live app would produce.
    // ================================================================================
    private static string GeneratePnr() => "PNR" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

    private static async Task<decimal> ComputeTaxAsync(AppDbContext db, decimal subTotal)
    {
      var activePercentages = await db.TaxRules.Where(t => t.IsActive).Select(t => t.Percentage).ToListAsync();
      if (activePercentages.Count == 0)
      {
        return 0m;
      }
      return Math.Round(subTotal * (activePercentages.Sum() / 100m), 2);
    }

    private static async Task<List<Guid>> GetAvailableSeatIdsAsync(AppDbContext db, Guid tripId, int count)
    {
      return await db.TripSeats
          .Where(ts => ts.TripId == tripId && ts.Status == TripSeatStatus.Available)
          .OrderBy(ts => ts.SeatNumber)
          .Select(ts => ts.Id)
          .Take(count)
          .ToListAsync();
    }

    private static async Task<Booking> CreateBookingRecordAsync(
        AppDbContext db, Trip trip, SeatHold hold, Guid? customerProfileId, Guid? salesCounterId, Guid? agentId,
        string contactName, string contactPhone, string? contactEmail, List<PassengerInfo> passengers)
    {
      var holdItems = await db.SeatHoldItems.Where(i => i.SeatHoldId == hold.Id).ToListAsync();
      var subTotal = holdItems.Sum(i => i.FareAtHold);
      var taxAmount = await ComputeTaxAsync(db, subTotal);
      var isCounterSale = salesCounterId.HasValue;

      var booking = new Booking
      {
        CustomerProfileId = customerProfileId,
        BusOperatorId = trip.BusOperatorId,
        TripId = trip.Id,
        SeatHoldId = hold.Id,
        SalesCounterId = salesCounterId,
        AgentId = agentId,
        BoardingTerminalId = trip.DepartureTerminalId,
        DroppingTerminalId = trip.ArrivalTerminalId,
        Pnr = GeneratePnr(),
        ContactName = contactName,
        ContactPhone = contactPhone,
        ContactEmail = contactEmail,
        Source = isCounterSale ? BookingSource.Counter : (agentId.HasValue ? BookingSource.Agent : BookingSource.Web),
        SaleChannel = isCounterSale ? SaleChannel.Counter : (agentId.HasValue ? SaleChannel.Agent : SaleChannel.Online),
        MoneyCollectedBy = isCounterSale ? MoneyCollectedBy.Operator : MoneyCollectedBy.Platform,
        SubTotal = subTotal,
        DiscountAmount = 0m,
        TaxAmount = taxAmount,
        ServiceChargeAmount = 0m,
        Currency = trip.Currency,
        RequiresExternalConfirmation = trip.InventoryMode != OperatorInventoryMode.PlatformManaged,
        ExpiresAtUtc = hold.HoldExpiresAtUtc,
        Passengers = passengers.Select(p => new BookingPassenger
        {
          FullName = p.FullName,
          Phone = p.Phone,
          Email = p.Email,
          Gender = p.Gender,
          PassengerType = p.Type,
          Age = p.Age,
          NationalIdNumber = p.NationalId,
        }).ToList(),
      };
      booking.RecomputeTotals();
      db.Bookings.Add(booking);
      await db.SaveChangesAsync();
      return booking;
    }

    // Runs a cancellation through to a settled refund. Leaves the CancellationRequest at
    // Approved (not Completed) whenever the refund doesn't reach Succeeded on its own -
    // e.g. a guest refund parked at PendingManualPayout - so the tester has a real button
    // left to click, exactly like a real support agent would.
    private static async Task<Refund> CancelAndRefundAsync(
        AppDbContext db, CancellationProcessingService cancellationService, RefundProcessingService refundService,
        Booking booking, Guid? ticketId, Guid? requestedByUserId, Guid? approvedByUserId, string reason, bool completeManualPayout)
    {
      var request = await cancellationService.RequestAsync(booking.Id, ticketId, requestedByUserId, reason);
      // ApproveAsync now drives the linked Refund through RefundProcessingService's own
      // Approve+Process itself (see CancellationProcessingService.cs's own comment on
      // that call) - so by the time this returns, the refund is already
      // Approved/Processing/Succeeded/Failed/ReconciliationNeeded/PendingManualPayout.
      // Calling refundService.ApproveAsync/ProcessAsync again here would just throw
      // ("only a Requested refund can be approved") since it's no longer sitting at
      // Requested by this point.
      await cancellationService.ApproveAsync(request.Id, approvedByUserId, null, "Approved per policy.");

      var refund = await db.Refunds.FirstAsync(r => r.CancellationRequestId == request.Id);

      var refreshed = await db.Refunds.AsNoTracking().FirstAsync(r => r.Id == refund.Id);

      if (completeManualPayout && refreshed.Status == RefundStatus.PendingManualPayout)
      {
        await refundService.CompleteManualPayoutAsync(refreshed.Id, "BANK-TXN-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant());
        refreshed = await db.Refunds.AsNoTracking().FirstAsync(r => r.Id == refund.Id);
      }

      if (refreshed.Status == RefundStatus.Succeeded)
      {
        await cancellationService.CompleteAsync(request.Id);
      }

      return refreshed;
    }

    private static async Task SeedBookingScenariosAsync(AppDbContext db, DemoContext ctx)
    {
      // Chunk 3: SeatHoldService now takes IConfiguration (for the configurable stop-sales
      // window) — same "no real config available here, an empty one gives the same
      // zero/default behaviour" pattern already used for PaymentConfirmationService below.
      var seatHoldService = new SeatHoldService(db, new ConfigurationBuilder().Build());
      var financeLedgerService = new FinanceLedgerService(db);
      var couponService = new CouponRedemptionService(db);
      var walletService = new CustomerWalletService(db);
      var refundService = new RefundProcessingService(db, financeLedgerService, walletService);
      // CancellationProcessingService now also takes ExternalBookingSyncService (best-effort
      // operator-ERP sync on cancel). Same "no real config/HttpClient available here" pattern
      // as seatHoldService/paymentService above — a no-op IConfiguration + a throwaway
      // HttpClient + NullLogger give the same zero/default behaviour, and every seeded booking
      // here is PlatformManaged anyway, so TryCancelExternalBookingAsync is a no-op regardless.
      var externalSyncService = new ExternalBookingSyncService(
          db, new HttpClient(), new ConfigurationBuilder().Build(), seatHoldService,
          NullLogger<ExternalBookingSyncService>.Instance);
      var cancellationService = new CancellationProcessingService(db, seatHoldService, externalSyncService, refundService);
      var paymentService = new PaymentConfirmationService(db, seatHoldService, financeLedgerService, new ConfigurationBuilder().Build());

      await walletService.CreditAsync(ctx.Customers["rahim.uddin"].Id, 500m, CustomerWalletTransactionType.TopUp, description: "Wallet top-up via bKash.");
      await walletService.CreditAsync(ctx.Customers["mitu.rahman"].Id, 200m, CustomerWalletTransactionType.AdminAdjustment, description: "Goodwill credit for a delayed trip.");

      var sslcommerzId = ctx.Providers["SSLCommerz"].Id;
      var bkashId = ctx.Providers["bKash"].Id;
      var nagadId = ctx.Providers["Nagad"].Id;

      // --- Scenario 1: online confirmed, 1 passenger, WELCOME100 coupon, bKash ---
      {
        var trip = ctx.Trips["GL-2"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["rahim.uddin"].Id, "103.94.10.11", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["rahim.uddin"].Id, null, null,
            "Rahim Uddin", "+8801711223344", "rahim.uddin@example.com",
            new List<PassengerInfo> { new("Rahim Uddin", "+8801711223344", "rahim.uddin@example.com", Gender.Male, PassengerType.Adult, 34, "1912345678901") });

        await couponService.RedeemAsync(ctx.Coupons["WELCOME100"].Id, booking.Id, ctx.Customers["rahim.uddin"].Id);

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.MobileBanking, bkashId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "BKS" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.018m, 2), "{\"status\":\"Completed\"}");

        ctx.Bookings["S1-Rahim-GL2"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 2: online confirmed, 2 passengers, EID20 coupon, SSLCommerz card ---
      {
        var trip = ctx.Trips["GL-3"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 2);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["karim.sheikh"].Id, "103.94.10.22", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["karim.sheikh"].Id, null, null,
            "Karim Sheikh", "+8801722334455", "karim.sheikh@example.com",
            new List<PassengerInfo>
            {
                        new("Karim Sheikh", "+8801722334455", "karim.sheikh@example.com", Gender.Male, PassengerType.Adult, 38, "1988765432101"),
                        new("Rupa Sheikh", null, null, Gender.Female, PassengerType.Adult, 33, null),
            });

        await couponService.RedeemAsync(ctx.Coupons["EID20"].Id, booking.Id, ctx.Customers["karim.sheikh"].Id);

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.Card, sslcommerzId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "SSL" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.025m, 2), "{\"status\":\"VALID\"}");

        ctx.Bookings["S2-Karim-GL3"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 3: completed trip, 2 passengers, Nagad, tickets used ---
      {
        var trip = ctx.Trips["GL-1"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 2);
        // GL-1 is deliberately seeded as TripStatus.Completed with a past DepartureTimeUtc
        // (see AddTripAsync above) so there's a realistic "trip already happened, ticket
        // already used" scenario to click through in the demo. Chunk 3's trip-state
        // gating would otherwise correctly refuse this exact hold for a real customer —
        // skipSellabilityCheck is the documented, seeder-only escape hatch for backfilling
        // historical data onto a trip that's no longer actually bookable.
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["fatema.begum"].Id, "103.94.10.33", "Mozilla/5.0 (Android 13; Mobile)", skipSellabilityCheck: true);
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["fatema.begum"].Id, null, null,
            "Fatema Begum", "+8801733445566", "fatema.begum@example.com",
            new List<PassengerInfo>
            {
                        new("Fatema Begum", "+8801733445566", "fatema.begum@example.com", Gender.Female, PassengerType.Adult, 29, "1995123456789"),
                        new("Abul Kalam", "+8801733445567", null, Gender.Male, PassengerType.Adult, 34, null),
            });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.MobileBanking, nagadId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "NGD" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.015m, 2), "{\"status\":\"Success\"}");

        // The trip already happened - move the booking/tickets on to their natural end state
        // (nothing in the app does this automatically yet).
        var confirmedBooking = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
        var tickets = await db.Tickets.Where(t => t.BookingId == booking.Id).ToListAsync();
        foreach (var ticket in tickets)
        {
          ticket.CheckedInAtUtc = trip.ActualDepartureTimeUtc!.Value.AddMinutes(-20);
          ticket.Status = TicketStatus.Used;
        }
        confirmedBooking.Status = BookingStatus.Completed;
        confirmedBooking.CompletedAtUtc = trip.ActualArrivalTimeUtc;
        await db.SaveChangesAsync();

        ctx.Bookings["S3-Fatema-GL1"] = confirmedBooking;
      }

      // --- Scenario 4: online booking (Shohagh), cancelled + refunded to customer wallet ---
      {
        var trip = ctx.Trips["SHO-1"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["nasrin.sultana"].Id, "103.94.10.44", "Mozilla/5.0 (Windows NT 10.0)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["nasrin.sultana"].Id, null, null,
            "Nasrin Sultana", "+8801744556677", "nasrin.sultana@example.com",
            new List<PassengerInfo> { new("Nasrin Sultana", "+8801744556677", "nasrin.sultana@example.com", Gender.Female, PassengerType.Adult, 32, "1992765432198") });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.Card, sslcommerzId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "SSL" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.025m, 2), "{\"status\":\"VALID\"}");

        await CancelAndRefundAsync(db, cancellationService, refundService, booking, null, ctx.CustomerUsers["nasrin.sultana"].Id, ctx.StaffUsers["tanvir.ops"].Id, "Change of travel plans.", completeManualPayout: false);

        ctx.Bookings["S4-Nasrin-SHO1"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 5: online booking, 3 passengers, one ticket cancelled (partial refund) ---
      {
        var trip = ctx.Trips["GL-4"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 3);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["jashim.uddin"].Id, "103.94.10.55", "Mozilla/5.0 (Linux; Android 12)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["jashim.uddin"].Id, null, null,
            "Jashim Uddin", "+8801755667788", "jashim.uddin@example.com",
            new List<PassengerInfo>
            {
                        new("Jashim Uddin", "+8801755667788", "jashim.uddin@example.com", Gender.Male, PassengerType.Adult, 40, "1985345678912"),
                        new("Ruma Begum", null, null, Gender.Female, PassengerType.Adult, 36, null),
                        new("Tanvir Jashim", null, null, Gender.Male, PassengerType.Child, 9, null),
            });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.MobileBanking, bkashId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "BKS" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.018m, 2), "{\"status\":\"Completed\"}");

        var ticketToCancel = await db.Tickets.Where(t => t.BookingId == booking.Id).OrderBy(t => t.SeatNumberSnapshot).FirstAsync();
        await CancelAndRefundAsync(db, cancellationService, refundService, booking, ticketToCancel.Id, ctx.CustomerUsers["jashim.uddin"].Id, ctx.StaffUsers["tanvir.ops"].Id, "One passenger could no longer travel.", completeManualPayout: false);

        ctx.Bookings["S5-Jashim-GL4"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 6: guest checkout, cancelled, refund parked at PendingManualPayout ---
      {
        var trip = ctx.Trips["SHO-1"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, null, "103.94.10.66", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, null, null, null,
            "Md. Aynul Haque", "+8801766778899", null,
            new List<PassengerInfo> { new("Md. Aynul Haque", "+8801766778899", null, Gender.Male, PassengerType.Adult, 45, "1980112233445") });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.Card, sslcommerzId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "SSL" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.025m, 2), "{\"status\":\"VALID\"}");

        await CancelAndRefundAsync(db, cancellationService, refundService, booking, null, null, ctx.StaffUsers["rezaul.support"].Id, "Guest requested cancellation by phone.", completeManualPayout: false);

        ctx.Bookings["S6-Guest-SHO1"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 7: online booking, payment fails, seats released, booking left stranded ---
      {
        var trip = ctx.Trips["GL-2"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["rahim.uddin"].Id, "103.94.10.11", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["rahim.uddin"].Id, null, null,
            "Rahim Uddin", "+8801711223344", "rahim.uddin@example.com",
            new List<PassengerInfo> { new("Rahim Uddin", "+8801711223344", "rahim.uddin@example.com", Gender.Male, PassengerType.Adult, 34, "1912345678901") });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.Card, sslcommerzId);
        await paymentService.FailPaymentAsync(payment.Id, hold.HoldToken, "Card declined by issuing bank.");

        ctx.Bookings["S7-Rahim-GL2-Failed"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 8: online booking, mid-checkout - payment initiated but not confirmed ---
      {
        var trip = ctx.Trips["GL-5"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        // Long hold window (vs. the usual 5 minutes) so this stays visibly "active" for a
        // while after seeding, instead of the sweep job expiring it before anyone looks.
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 180, ctx.CustomerUsers["shirin.akter"].Id, "103.94.10.77", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["shirin.akter"].Id, null, null,
            "Shirin Akter", "+8801777889900", "shirin.akter@example.com",
            new List<PassengerInfo> { new("Shirin Akter", "+8801777889900", "shirin.akter@example.com", Gender.Female, PassengerType.Adult, 27, "1998456789123") });

        await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.MobileBanking, bkashId);
        // Deliberately left unconfirmed.

        ctx.Bookings["S8-Shirin-GL5-Pending"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 9: counter sale (Green Line), cash, walk-in guest ---
      {
        var trip = ctx.Trips["GL-2"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.StaffUsers["selina.counter.gl"].Id, "10.0.0.5", "TicketPortal-Counter-Terminal/1.0");
        var booking = await CreateBookingRecordAsync(db, trip, hold, null, ctx.Counters["GL-Gabtoli"].Id, null,
            "Md. Selim Reza", "+8801788990011", null,
            new List<PassengerInfo> { new("Md. Selim Reza", "+8801788990011", null, Gender.Male, PassengerType.Adult, 50, "1975667788990") });

        await paymentService.ConfirmCounterSaleAsync(booking.Id, hold.HoldToken, PaymentMethod.Cash);

        ctx.Bookings["S9-Counter-GL2"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 10: counter sale (Ena), 2 passengers, one ticket cancelled + commission reversed ---
      {
        var trip = ctx.Trips["ENA-2"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 2);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.StaffUsers["nasima.counter.ena"].Id, "10.0.0.6", "TicketPortal-Counter-Terminal/1.0");
        var booking = await CreateBookingRecordAsync(db, trip, hold, null, ctx.Counters["ENA-Gabtoli"].Id, null,
            "Md. Harun-Or-Rashid", "+8801799001122", null,
            new List<PassengerInfo>
            {
                        new("Md. Harun-Or-Rashid", "+8801799001122", null, Gender.Male, PassengerType.Adult, 48, "1976778899001"),
                        new("Rashida Khatun", null, null, Gender.Female, PassengerType.Adult, 44, null),
            });

        await paymentService.ConfirmCounterSaleAsync(booking.Id, hold.HoldToken, PaymentMethod.Cash);

        var ticketToCancel = await db.Tickets.Where(t => t.BookingId == booking.Id).OrderBy(t => t.SeatNumberSnapshot).FirstAsync();
        await CancelAndRefundAsync(db, cancellationService, refundService, booking, ticketToCancel.Id, ctx.StaffUsers["nasima.counter.ena"].Id, ctx.StaffUsers["tanvir.ops"].Id, "Passenger cancelled at the counter before departure.", completeManualPayout: false);

        ctx.Bookings["S10-Counter-ENA2"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 10b: a second, un-cancelled Ena counter sale (Ena has no online sales
      //     this period, so its settlement cleanly nets OperatorPaysPlatform) ---
      {
        var trip = ctx.Trips["ENA-1"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.StaffUsers["nasima.counter.ena"].Id, "10.0.0.6", "TicketPortal-Counter-Terminal/1.0");
        var booking = await CreateBookingRecordAsync(db, trip, hold, null, ctx.Counters["ENA-Gabtoli"].Id, null,
            "Md. Jahangir Alam", "+8801700112233", null,
            new List<PassengerInfo> { new("Md. Jahangir Alam", "+8801700112233", null, Gender.Male, PassengerType.Adult, 39, null) });

        await paymentService.ConfirmCounterSaleAsync(booking.Id, hold.HoldToken, PaymentMethod.Cash);

        ctx.Bookings["S10b-Counter-ENA1"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 11: agent-sold booking on a promo-fare trip (Shohagh) ---
      {
        var trip = ctx.Trips["SHO-2"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["mitu.rahman"].Id, "103.94.10.88", "Mozilla/5.0 (Windows NT 10.0)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["mitu.rahman"].Id, null, ctx.Agents["Bismillah"].Id,
            "Mitu Rahman", "+8801811223344", "mitu.rahman@example.com",
            new List<PassengerInfo> { new("Mitu Rahman", "+8801811223344", "mitu.rahman@example.com", Gender.Female, PassengerType.Adult, 31, "1993987654321") });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.MobileBanking, bkashId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "BKS" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.018m, 2), "{\"status\":\"Completed\"}");

        ctx.Bookings["S11-Mitu-SHO2-Agent"] = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
      }

      // --- Scenario 12: API-connected operator (Hanif), booking synced successfully ---
      {
        var trip = ctx.Trips["HAN-1"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["rahim.uddin"].Id, "103.94.10.11", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["rahim.uddin"].Id, null, null,
            "Rahim Uddin", "+8801711223344", "rahim.uddin@example.com",
            new List<PassengerInfo> { new("Rahim Uddin", "+8801711223344", "rahim.uddin@example.com", Gender.Male, PassengerType.Adult, 34, "1912345678901") });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.Card, sslcommerzId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "SSL" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.025m, 2), "{\"status\":\"VALID\"}");

        var confirmedBooking = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
        confirmedBooking.ExternalBookingKey = "HAN-BKG-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        confirmedBooking.ExternalPnr = "HANPNR" + Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        confirmedBooking.RequiresExternalConfirmation = false;
        confirmedBooking.ExternalConfirmedAtUtc = DateTime.UtcNow.AddMinutes(-2);
        await db.SaveChangesAsync();

        db.ExternalBookingMappings.Add(new ExternalBookingMapping
        {
          OperatorIntegrationId = ctx.HanifIntegration.Id,
          BookingId = booking.Id,
          ExternalBookingKey = confirmedBooking.ExternalBookingKey!,
          ExternalPnr = confirmedBooking.ExternalPnr,
          LastKnownExternalStatus = BookingStatus.Confirmed,
          LastSyncedAtUtc = DateTime.UtcNow.AddMinutes(-2),
        });
        db.IntegrationSyncLogs.Add(new IntegrationSyncLog
        {
          OperatorIntegrationId = ctx.HanifIntegration.Id,
          EntityName = "Booking",
          EntityKey = confirmedBooking.ExternalBookingKey,
          Operation = "ConfirmBooking",
          Status = IntegrationSyncStatus.Succeeded,
          StartedAtUtc = DateTime.UtcNow.AddMinutes(-2).AddSeconds(-3),
          CompletedAtUtc = DateTime.UtcNow.AddMinutes(-2),
          RequestJson = $"{{\"bookingId\":\"{booking.Id}\",\"pnr\":\"{confirmedBooking.Pnr}\"}}",
          ResponseJson = $"{{\"externalBookingId\":\"{confirmedBooking.ExternalBookingKey}\",\"status\":\"CONFIRMED\"}}",
        });

        var bookedSeat = await db.TripSeats.FirstAsync(ts => ts.BookingId == booking.Id);
        db.ExternalSeatMappings.Add(new ExternalSeatMapping
        {
          OperatorIntegrationId = ctx.HanifIntegration.Id,
          TripSeatId = bookedSeat.Id,
          ExternalSeatKey = "HAN-SEAT-" + bookedSeat.SeatNumber,
          ExternalSeatNumber = bookedSeat.SeatNumber,
        });

        await db.SaveChangesAsync();
        ctx.Bookings["S12-Rahim-HAN1"] = confirmedBooking;
      }

      // --- Scenario 13: API-connected operator (Hanif), paid but the ERP sync is still failing ---
      {
        var trip = ctx.Trips["HAN-2"];
        var seatIds = await GetAvailableSeatIdsAsync(db, trip.Id, 1);
        var hold = await seatHoldService.HoldSeatsAsync(trip.Id, seatIds, 5, ctx.CustomerUsers["karim.sheikh"].Id, "103.94.10.22", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)");
        var booking = await CreateBookingRecordAsync(db, trip, hold, ctx.Customers["karim.sheikh"].Id, null, null,
            "Karim Sheikh", "+8801722334455", "karim.sheikh@example.com",
            new List<PassengerInfo> { new("Karim Sheikh", "+8801722334455", "karim.sheikh@example.com", Gender.Male, PassengerType.Adult, 38, "1988765432101") });

        var payment = await paymentService.InitiatePaymentAsync(booking.Id, hold.HoldToken, PaymentMethod.MobileBanking, bkashId);
        await paymentService.ConfirmOnlinePaymentAsync(payment.Id, hold.HoldToken, "BKS" + Guid.NewGuid().ToString("N")[..9].ToUpperInvariant(), Math.Round(payment.Amount * 0.018m, 2), "{\"status\":\"Completed\"}");

        var confirmedBooking = await db.Bookings.FirstAsync(b => b.Id == booking.Id);
        // RequiresExternalConfirmation stays true - Hanif's ERP hasn't confirmed this seat yet.

        db.ExternalBookingMappings.Add(new ExternalBookingMapping
        {
          OperatorIntegrationId = ctx.HanifIntegration.Id,
          BookingId = booking.Id,
          ExternalBookingKey = "PENDING-" + confirmedBooking.Pnr,
          LastKnownExternalStatus = null,
          LastSyncedAtUtc = null,
        });
        db.IntegrationSyncLogs.AddRange(
            new IntegrationSyncLog
            {
              OperatorIntegrationId = ctx.HanifIntegration.Id,
              EntityName = "Booking",
              EntityKey = confirmedBooking.Pnr,
              Operation = "ConfirmBooking",
              Status = IntegrationSyncStatus.Failed,
              StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
              CompletedAtUtc = DateTime.UtcNow.AddMinutes(-10).AddSeconds(31),
              ErrorMessage = "Connection timed out after 30s.",
            },
            new IntegrationSyncLog
            {
              OperatorIntegrationId = ctx.HanifIntegration.Id,
              EntityName = "Booking",
              EntityKey = confirmedBooking.Pnr,
              Operation = "ConfirmBooking",
              Status = IntegrationSyncStatus.Retrying,
              StartedAtUtc = DateTime.UtcNow.AddMinutes(-1),
            });
        db.IntegrationWebhookLogs.Add(new IntegrationWebhookLog
        {
          OperatorIntegrationId = ctx.HanifIntegration.Id,
          ExternalEventId = "EVT-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
          EventType = "booking.status_changed",
          ReceivedAtUtc = DateTime.UtcNow.AddMinutes(-1),
          IsProcessed = false,
          PayloadJson = $"{{\"bookingId\":\"{confirmedBooking.Pnr}\",\"status\":\"PENDING\"}}",
        });

        await db.SaveChangesAsync();
        ctx.Bookings["S13-Karim-HAN2"] = confirmedBooking;
      }

      // Trip mappings for Hanif's two trips, now that bookings exist against them.
      db.ExternalTripMappings.AddRange(
          new ExternalTripMapping { OperatorIntegrationId = ctx.HanifIntegration.Id, TripId = ctx.Trips["HAN-1"].Id, ExternalTripKey = "HAN-TRIP-9001", LastSyncedAtUtc = DateTime.UtcNow.AddMinutes(-2), LastSeatSnapshotJson = "{\"availableSeats\":35}" },
          new ExternalTripMapping { OperatorIntegrationId = ctx.HanifIntegration.Id, TripId = ctx.Trips["HAN-2"].Id, ExternalTripKey = "HAN-TRIP-9002", LastSyncedAtUtc = DateTime.UtcNow.AddMinutes(-10), LastSeatSnapshotJson = "{\"availableSeats\":27}" });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 15. Reviews & complaints
    // ================================================================================
    private static async Task SeedReviewsAndComplaintsAsync(AppDbContext db, DemoContext ctx)
    {
      db.Reviews.AddRange(
          new Review { CustomerProfileId = ctx.Customers["fatema.begum"].Id, TripId = ctx.Trips["GL-1"].Id, BookingId = ctx.Bookings["S3-Fatema-GL1"].Id, Rating = 5, Comment = "Great service, comfortable AC bus, and we arrived right on time!" },
          new Review { CustomerProfileId = ctx.Customers["rahim.uddin"].Id, TripId = ctx.Trips["GL-1"].Id, BookingId = null, Rating = 4, Comment = "Good overall, though the AC was a bit too cold for the whole journey." },
          new Review { CustomerProfileId = ctx.Customers["mitu.rahman"].Id, TripId = ctx.Trips["ENA-3"].Id, BookingId = null, Rating = 4, Comment = "Decent trip but the seats felt a bit worn out." },
          new Review { CustomerProfileId = ctx.Customers["nasrin.sultana"].Id, TripId = ctx.Trips["ENA-3"].Id, BookingId = null, Rating = 3, Comment = "Average experience - boarding took longer than expected." });

      db.Complaints.AddRange(
          new Complaint { CustomerProfileId = ctx.Customers["nasrin.sultana"].Id, BookingId = ctx.Bookings["S4-Nasrin-SHO1"].Id, Subject = "Refund delay concern", Description = "I cancelled my ticket a few days ago and wanted to check on the refund status.", Status = ComplaintStatus.Resolved, ResolvedAtUtc = DateTime.UtcNow.AddDays(-1) },
          new Complaint { CustomerProfileId = ctx.Customers["jashim.uddin"].Id, BookingId = ctx.Bookings["S5-Jashim-GL4"].Id, Subject = "Only got a partial refund", Description = "One of our three tickets was cancelled but I want to understand how the refund amount was calculated.", Status = ComplaintStatus.InProgress },
          new Complaint { CustomerProfileId = ctx.Customers["karim.sheikh"].Id, BookingId = null, Subject = "Website payment page froze", Description = "The card payment page froze midway during checkout on the website; had to retry twice.", Status = ComplaintStatus.Open },
          new Complaint { CustomerProfileId = ctx.Customers["shirin.akter"].Id, BookingId = null, Subject = "Seat map not loading on mobile", Description = "The seat selection map does not render correctly on my Android phone's browser.", Status = ComplaintStatus.Closed, ResolvedAtUtc = DateTime.UtcNow.AddDays(-3) });

      await db.SaveChangesAsync();
    }

    // ================================================================================
    // 16. Finance cycle: settlements, invoices/receipts, payouts - one full lifecycle
    //     per operator, each stopped at a different, testable stage.
    // ================================================================================
    private static async Task SeedFinanceCycleAsync(AppDbContext db, DemoContext ctx)
    {
      var settlementService = new SettlementGenerationService(db);
      var invoiceService = new InvoicePaymentService(db);
      var payoutService = new PayoutProcessingService(db);

      var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
      var toDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

      // Green Line: platform owes them - settle, approve, pay out in full.
      var glSettlement = await settlementService.GenerateSettlementAsync(ctx.GreenLine.Id, fromDate, toDate, "Routine settlement covering this period's online and counter sales.");
      await settlementService.ApproveAsync(glSettlement.Id, "Verified against ledger totals.");
      var glWallet = await db.OperatorWallets.AsNoTracking().FirstAsync(w => w.BusOperatorId == ctx.GreenLine.Id);
      if (glWallet.AvailablePayoutBalance > 0)
      {
        var glPayout = await payoutService.CreateAsync(ctx.GreenLine.Id, glWallet.AvailablePayoutBalance, "BDT", glSettlement.Id, "Weekly payout for online + counter sales.");
        await payoutService.MarkProcessingAsync(glPayout.Id);
        await payoutService.CompleteAsync(glPayout.Id, "BFTN-" + Guid.NewGuid().ToString("N")[..10].ToUpperInvariant());
      }

      // Ena: counter-only this period, so they owe the platform - auto-invoice, partially paid.
      var enaSettlement = await settlementService.GenerateSettlementAsync(ctx.Ena.Id, fromDate, toDate, "Routine settlement covering this period's counter sales.");
      await settlementService.ApproveAsync(enaSettlement.Id, "Verified against ledger totals.");
      if (enaSettlement.OperatorInvoiceId.HasValue)
      {
        await invoiceService.IssueAsync(enaSettlement.OperatorInvoiceId.Value);
        var enaInvoice = await db.OperatorInvoices.AsNoTracking().FirstAsync(i => i.Id == enaSettlement.OperatorInvoiceId.Value);
        var partialAmount = Math.Round(enaInvoice.Amount * 0.6m, 2);
        if (partialAmount > 0)
        {
          await invoiceService.RecordReceiptAsync(enaInvoice.Id, partialAmount, "BDT", "ENA-BANK-RCPT-0001", "First installment received via bank transfer.");
        }
      }

      // Shohagh: left as a Draft settlement, untouched - tests the Approve button.
      await settlementService.GenerateSettlementAsync(ctx.Shohagh.Id, fromDate, toDate, "Awaiting finance team review.");

      // Hanif: platform owes them, but the payout attempt fails - tests the Fail lifecycle.
      var hanSettlement = await settlementService.GenerateSettlementAsync(ctx.Hanif.Id, fromDate, toDate, "Online-only settlement (API-connected operator).");
      await settlementService.ApproveAsync(hanSettlement.Id, "Verified against ledger totals.");
      var hanWallet = await db.OperatorWallets.AsNoTracking().FirstAsync(w => w.BusOperatorId == ctx.Hanif.Id);
      if (hanWallet.AvailablePayoutBalance > 0)
      {
        var hanPayout = await payoutService.CreateAsync(ctx.Hanif.Id, hanWallet.AvailablePayoutBalance, "BDT", hanSettlement.Id, "Weekly payout for online sales.");
        await payoutService.MarkProcessingAsync(hanPayout.Id);
        await payoutService.FailAsync(hanPayout.Id, "Bank rejected the transfer - invalid account number on file.");
      }
    }

    // ================================================================================
    // 17. Diagnostics: activity/audit logs, login history, notification logs
    // ================================================================================
    private static async Task SeedDiagnosticsAsync(AppDbContext db, DemoContext ctx)
    {
      var adminUser = await db.Users.FirstAsync(u => u.UserName == DbSeeder.BootstrapAdminUserName);
      var rahimUser = ctx.CustomerUsers["rahim.uddin"];
      var nasrinUser = ctx.CustomerUsers["nasrin.sultana"];
      var tanvirUser = ctx.StaffUsers["tanvir.ops"];

      db.ActivityLogs.AddRange(
          new ActivityLog { UserId = rahimUser.Id, Action = "Booking.Created", EntityName = "Booking", EntityId = ctx.Bookings["S1-Rahim-GL2"].Id.ToString(), IpAddress = "103.94.10.11" },
          new ActivityLog { UserId = rahimUser.Id, Action = "Payment.Confirmed", EntityName = "Booking", EntityId = ctx.Bookings["S1-Rahim-GL2"].Id.ToString(), IpAddress = "103.94.10.11" },
          new ActivityLog { UserId = nasrinUser.Id, Action = "Booking.CancellationRequested", EntityName = "Booking", EntityId = ctx.Bookings["S4-Nasrin-SHO1"].Id.ToString(), IpAddress = "103.94.10.44" },
          new ActivityLog { UserId = tanvirUser.Id, Action = "Refund.Approved", EntityName = "Booking", EntityId = ctx.Bookings["S4-Nasrin-SHO1"].Id.ToString(), IpAddress = "10.0.0.2" },
          new ActivityLog { UserId = adminUser.Id, Action = "Settlement.Approved", EntityName = "BusOperator", EntityId = ctx.GreenLine.Id.ToString(), IpAddress = "10.0.0.1" },
          new ActivityLog { UserId = adminUser.Id, Action = "Payout.Completed", EntityName = "BusOperator", EntityId = ctx.GreenLine.Id.ToString(), IpAddress = "10.0.0.1" });

      db.AuditLogs.AddRange(
          new AuditLog
          {
            UserId = adminUser.Id,
            EntityName = "Booking",
            EntityId = ctx.Bookings["S1-Rahim-GL2"].Id.ToString(),
            Action = "Updated",
            OldValuesJson = "{\"Status\":\"PendingPayment\"}",
            NewValuesJson = "{\"Status\":\"Confirmed\"}",
            IpAddress = "103.94.10.11",
            UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
          new AuditLog
          {
            UserId = tanvirUser.Id,
            EntityName = "Refund",
            EntityId = ctx.Bookings["S4-Nasrin-SHO1"].Id.ToString(),
            Action = "Updated",
            OldValuesJson = "{\"Status\":\"Requested\"}",
            NewValuesJson = "{\"Status\":\"Approved\"}",
            IpAddress = "10.0.0.2",
            UserAgent = "TicketPortal-Admin/1.0",
          },
          new AuditLog
          {
            UserId = adminUser.Id,
            EntityName = "Trip",
            EntityId = ctx.Trips["GL-6"].Id.ToString(),
            Action = "Updated",
            OldValuesJson = "{\"Status\":\"Scheduled\"}",
            NewValuesJson = "{\"Status\":\"Cancelled\"}",
            IpAddress = "10.0.0.1",
            UserAgent = "TicketPortal-Admin/1.0",
          });

      db.LoginHistories.AddRange(
          new LoginHistory { UserId = adminUser.Id, LoginAtUtc = DateTime.UtcNow.AddDays(-1), IpAddress = "10.0.0.1", UserAgent = "TicketPortal-Admin/1.0", Success = true },
          new LoginHistory { UserId = rahimUser.Id, LoginAtUtc = DateTime.UtcNow.AddHours(-5), IpAddress = "103.94.10.11", UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", Success = true },
          new LoginHistory { UserId = rahimUser.Id, LoginAtUtc = DateTime.UtcNow.AddDays(-2), IpAddress = "103.94.10.11", UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", Success = false },
          new LoginHistory { UserId = nasrinUser.Id, LoginAtUtc = DateTime.UtcNow.AddHours(-8), IpAddress = "103.94.10.44", UserAgent = "Mozilla/5.0 (Windows NT 10.0)", Success = true });

      db.NotificationLogs.AddRange(
          new NotificationLog { BookingId = ctx.Bookings["S1-Rahim-GL2"].Id, UserId = rahimUser.Id, Channel = NotificationChannel.Email, Recipient = "rahim.uddin@example.com", Subject = "Your TicketPortal booking is confirmed!", Message = $"Your PNR is {ctx.Bookings["S1-Rahim-GL2"].Pnr}.", Status = NotificationStatus.Sent, SentAtUtc = DateTime.UtcNow.AddMinutes(-30), ProviderMessageId = "MSG-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant() },
          new NotificationLog { BookingId = ctx.Bookings["S1-Rahim-GL2"].Id, UserId = rahimUser.Id, Channel = NotificationChannel.Sms, Recipient = "+8801711223344", Message = $"TicketPortal: Booking {ctx.Bookings["S1-Rahim-GL2"].Pnr} confirmed.", Status = NotificationStatus.Sent, SentAtUtc = DateTime.UtcNow.AddMinutes(-30) },
          new NotificationLog { BookingId = ctx.Bookings["S6-Guest-SHO1"].Id, Channel = NotificationChannel.Sms, Recipient = "+8801766778899", Message = "TicketPortal: Your refund is being processed.", Status = NotificationStatus.Failed, ErrorMessage = "Invalid recipient number format." });

      await db.SaveChangesAsync();
    }
  }
}

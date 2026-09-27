using System;

// This file is the "vocabulary" of the whole system — every fixed list of choices
// (statuses, types, channels) used anywhere in the models lives here. Reading this file
// top to bottom is a fast way to understand what states things can be in.
namespace TicketPortal.Api.Models.Enums
{
    // The physical type/class of a bus, shown to customers while searching.
    public enum BusType
    {
        NonAc = 1,
        Ac = 2,
        Sleeper = 3,
        DoubleDecker = 4,
        BusinessClass = 5,
        Economy = 6,
        Luxury = 7
    }

    // What kind of seat a specific seat is, for filtering/pricing (e.g. window seats might
    // cost slightly more, sleeper seats are priced very differently to regular ones).
    public enum SeatType
    {
        Regular = 1,
        Window = 2,
        Aisle = 3,
        Middle = 4,
        Sleeper = 5,
        Business = 6
    }

    // The life of one scheduled journey (a Trip), from being planned to actually finishing.
    public enum TripStatus
    {
        Scheduled = 1,   // Created, seats can be sold, bus hasn't left yet.
        Boarding = 2,    // Passengers are boarding at the terminal right now.
        Departed = 3,    // Bus has left the starting terminal.
        Running = 4,     // On the road, en route.
        Arrived = 5,     // Reached the final terminal.
        Completed = 6,   // Trip fully closed out (used for reporting/history).
        Delayed = 7,     // Running late - DelayReason on Trip explains why.
        Cancelled = 8    // Trip called off; any bookings on it need refunding.
    }

    // The state of ONE seat on ONE specific trip (this is what actually controls whether a
    // customer can select that seat on the seat map).
    public enum TripSeatStatus
    {
        Available = 1,  // Free to select.
        Held = 2,       // Someone is mid-checkout on this seat right now (see SeatHold).
        Booked = 3,     // Paid for and confirmed.
        Blocked = 4,    // Taken out of sale on purpose (e.g. reserved for staff, broken seat).
        Cancelled = 5   // Was booked, booking was cancelled - seat map logic treats this as
                        // "no longer valid", separate from simply going back to Available.
    }

    // The life of a temporary "3-5 minute" seat hold created the moment a customer picks
    // seats, before they've actually paid.
    public enum SeatHoldStatus
    {
        Active = 1,              // Timer is running, seats are reserved for this customer only.
        ConvertedToBooking = 2,  // Customer paid in time - hold turned into a real Booking.
        Expired = 3,             // Timer ran out before payment - background job released the seats.
        Released = 4,            // Customer backed out / changed seats before the timer ran out.
        Cancelled = 5            // Hold cancelled by an admin/system action.
    }

    // The life of an entire booking (which can cover several seats/passengers at once).
    public enum BookingStatus
    {
        Draft = 1,               // Being built, not yet submitted for payment.
        PendingPayment = 2,      // Waiting on the customer to pay within the hold window.
        Confirmed = 3,           // Paid and locked in.
        Completed = 4,           // Trip has happened, booking fully closed out.
        PartiallyCancelled = 5,  // Some passengers/seats on this booking were cancelled, not all.
        Cancelled = 6,           // Whole booking cancelled.
        Expired = 7,             // Payment window ran out, same idea as SeatHoldStatus.Expired,
                                  // but recorded on the booking itself.
        Failed = 8,              // Payment attempt failed outright.
        Refunded = 9             // Money has been sent back to the customer.
    }

    // The life of ONE physical ticket (one seat, one passenger) - a Booking can contain many
    // Tickets. This is what actually gets scanned/checked at the terminal.
    public enum TicketStatus
    {
        PendingPayment = 1,
        Issued = 2,       // Paid - this is the customer's real, usable ticket.
        CheckedIn = 3,    // Passenger has shown up and been checked in at the terminal.
        Used = 4,         // Passenger boarded / travelled.
        Cancelled = 5,
        Refunded = 6,
        NoShow = 7        // Passenger never checked in - seat travelled empty.
    }

    // Where a booking was STARTED from - mainly useful for reporting ("how many bookings come
    // from the mobile app vs. counters vs. agents").
    public enum BookingSource
    {
        Web = 1,
        MobileApp = 2,
        Counter = 3,       // Booked in person at an operator's counter.
        Agent = 4,         // Booked through a travel agent.
        Admin = 5,         // Created manually by our own staff.
        ExternalApi = 6    // Came in through an operator's own ERP calling our API.
    }

    // Similar to BookingSource, but this is the field the FINANCE side actually keys off:
    // "which side of the business does this sale belong to". Online and Counter are the two
    // channels described in the business plan (platform booking vs. cash counter).
    public enum SaleChannel
    {
        Online = 1,
        Counter = 2,
        Agent = 3,
        Admin = 4,
        ExternalApi = 5
    }

    // For any given booking: who actually holds the cash right now?
    // Platform = customer paid us online, we owe the operator their share later.
    // Operator = customer paid cash at their counter, they owe US our commission later.
    // This one field is the switch that decides which side of the settlement flow a
    // booking belongs to.
    public enum MoneyCollectedBy
    {
        Platform = 1,
        Operator = 2,
        Agent = 3,
        Unknown = 4
    }

    // This is the field that makes the "operators can bring their own ERP" idea work.
    // It controls WHO is the source of truth for seat availability on a given operator/route/trip.
    public enum OperatorInventoryMode
    {
        // We own the seat map. Normal case for an operator using our full platform
        // (online booking AND our counter-sale ERP).
        PlatformManaged = 1,

        // The operator's own ERP owns the seat map. We only sell online by calling out to
        // their API to check/hold/confirm seats - we never touch their counter sales at all.
        ExternalApiManaged = 2,

        // A mix: e.g. they use our counters but their own system decides online availability,
        // or vice versa. Exists so we're not forced into an all-or-nothing choice per operator.
        Hybrid = 3
    }

    // The life of one payment attempt.
    public enum PaymentStatus
    {
        Initiated = 1,   // Customer started paying (redirected to gateway, etc.).
        Pending = 2,     // Gateway is processing, we're waiting on a final answer.
        Succeeded = 3,
        Failed = 4,
        Cancelled = 5,          // Customer backed out of the payment flow.
        PartiallyRefunded = 6,
        Refunded = 7,
        // Payment.Status itself never becomes this — the payment genuinely succeeded, and
        // that fact stays true. This value only ever appears on a PaymentHistory row, flagging
        // that the booking/tickets that were supposed to follow a Succeeded payment never
        // showed up (see PaymentConfirmationService.FlagStuckPaymentsAsync). Queryable with a
        // plain WHERE clause on PaymentHistories instead of being buried in a log line. Mirrors
        // RefundStatus.ReconciliationNeeded; stored as a plain int column, so this needs no
        // migration.
        ReconciliationNeeded = 8
    }

    // The life of one refund request against a payment.
    public enum RefundStatus
    {
        Requested = 1,
        Approved = 2,     // Staff/system approved it, not yet sent.
        Processing = 3,   // Being sent back through the gateway.
        Succeeded = 4,
        Rejected = 5,
        Failed = 6,
        // Guest checkout only (no CustomerProfile / wallet to credit): the ledger side has been
        // posted, but there's no automated way to actually pay the guest back yet, so it parks
        // here until staff supplies a manual payout reference. See RefundProcessingService.
        PendingManualPayout = 7,
        // The ledger post succeeded but the customer-wallet credit that was supposed to follow
        // it then threw — the operator side of the books is already adjusted, but the customer
        // hasn't actually been paid. Distinct from Failed (where nothing moved at all) so this
        // specific, worse partial-failure state is queryable with a plain WHERE clause instead
        // of being buried inside a Failed row's free-text remark. See
        // RefundProcessingService.ProcessAsync.
        ReconciliationNeeded = 8
    }

    // How the customer paid, in general terms (used for reporting/UI). See PaymentGateway
    // below for exactly WHICH provider actually processed it.
    public enum PaymentMethod
    {
        Cash = 1,
        Card = 2,
        MobileBanking = 3,   // bKash / Nagad / Rocket style wallets.
        BankTransfer = 4,
        OnlineGateway = 5,
        Wallet = 6           // Paid using the customer's own in-app wallet balance.
    }

    // Which specific payment company/rail actually processed the money.
    // NOTE: this list mixes real payment gateways (SslCommerz, Bkash, Stripe...) together with
    // card networks (Visa, MasterCard). In real life a card payment can be "Visa, processed
    // through SslCommerz" - both true at once - so if that distinction ever matters for
    // reporting, it needs its own separate field rather than living only in this one enum.
    public enum PaymentGateway
    {
        None = 1,
        SslCommerz = 2,
        Bkash = 3,
        Nagad = 4,
        Rocket = 5,
        Stripe = 6,
        PayPal = 7,
        Visa = 8,
        MasterCard = 9,
        Manual = 10   // Recorded by staff by hand (e.g. a bank transfer confirmed manually).
    }

    // A broader family/category for a PaymentProvider row - lets us group "all mobile banking
    // providers" or "all card networks" together for reporting, separate from the exact name.
    public enum PaymentProviderKind
    {
        Gateway = 1,
        MobileBanking = 2,
        CardNetwork = 3,
        Bank = 4,
        Cash = 5,
        Wallet = 6
    }

    public enum Gender
    {
        Unknown = 1,
        Male = 2,
        Female = 3,
        Other = 4
    }

    // Used for fare rules that vary by passenger type (e.g. child/student discounts).
    public enum PassengerType
    {
        Adult = 1,
        Child = 2,
        Senior = 3,
        Student = 4
    }

    // A staff member's JOB / function - for HR and reporting only. This is NOT what controls
    // login permissions (that's ApplicationRole, see Models/Identity).
    public enum StaffRole
    {
        SuperAdmin = 1,
        Admin = 2,
        Manager = 3,
        Operator = 4,       // Represents the operator's own management/back-office staff.
        CounterStaff = 5,
        BusOwner = 6,
        Driver = 7,
        Supervisor = 8,
        Helper = 9,
        Finance = 10,

        // RBAC Amendment v3: platform-side customer/booking support. Previously this persona
        // had no enum value of its own and demo data mislabeled it as Manager, which quietly
        // granted it Manager's fleet/trip/cancellation-approval permissions — see
        // DemoDataSeeder's rezaul.support fix and PermissionMatrix.PlatformScope.
        Support = 11
    }

    // A staff member's role specifically WHILE assigned to one trip (see TripCrew).
    public enum CrewRole
    {
        Driver = 1,
        AssistantDriver = 2,
        Supervisor = 3,
        Helper = 4
    }

    public enum CouponType
    {
        FixedAmount = 1,   // e.g. "100 BDT off".
        Percentage = 2     // e.g. "10% off".
    }

    public enum CancellationRequestStatus
    {
        Requested = 1,
        Approved = 2,
        Rejected = 3,
        Completed = 4   // Refund (if any) has actually gone out.
    }

    public enum NotificationChannel
    {
        Email = 1,
        Sms = 2,
        WhatsApp = 3,
        Push = 4
    }

    public enum NotificationStatus
    {
        Queued = 1,
        Sent = 2,
        Failed = 3
    }

    public enum OfferStatus
    {
        Active = 1,
        Expired = 2,
        Disabled = 3   // Turned off manually before its natural expiry date.
    }

    public enum ComplaintStatus
    {
        Open = 1,
        InProgress = 2,
        Resolved = 3,
        Closed = 4
    }

    public enum VehicleFuelType
    {
        Diesel = 1,
        Petrol = 2,
        Cng = 3,
        Electric = 4,
        Hybrid = 5
    }

    // Driving license class required to operate a given bus.
    public enum LicenseType
    {
        Light = 1,
        Heavy = 2,
        Commercial = 3
    }

    public enum AttendanceStatus
    {
        Present = 1,
        Absent = 2,
        OnLeave = 3
    }

    // How we authenticate when WE call OUT to an operator's own ERP API.
    public enum IntegrationAuthType
    {
        None = 1,
        ApiKey = 2,
        BearerToken = 3,
        Basic = 4,
        OAuth2 = 5
    }

    // The result of one attempt to sync data with an operator's ERP (pull their seat status,
    // push a booking, etc.) - written to IntegrationSyncLog every time we talk to them.
    public enum IntegrationSyncStatus
    {
        Pending = 1,
        Succeeded = 2,
        Failed = 3,
        Retrying = 4,
        Skipped = 5
    }

    public enum CommissionType
    {
        Percentage = 1,   // e.g. 10% of the fare.
        FixedAmount = 2   // e.g. flat 20 BDT per ticket.
    }

    // For an online sale, who actually pays the payment gateway's processing fee?
    public enum GatewayFeeBearer
    {
        Platform = 1,
        Operator = 2,
        Customer = 3
    }

    // After netting online sales against counter-sale commission for a period, who ends up
    // owing who? This is the headline answer a settlement produces.
    public enum SettlementDirection
    {
        PlatformPaysOperator = 1,   // We owe them money (normal case - we collected fares for them).
        OperatorPaysPlatform = 2,   // They owe us money (e.g. counter commission outweighs
                                    // whatever online fares we owe them).
        NetZero = 3
    }

    public enum SettlementStatus
    {
        Draft = 1,       // Calculated but not yet finalised.
        Approved = 2,    // Checked and signed off.
        Invoiced = 3,    // A bill/invoice has been generated for it.
        Paid = 4,        // Money has actually moved.
        Cancelled = 5
    }

    // What kind of financial event one ledger/statement line represents. This is the backbone
    // of the whole commission/settlement bookkeeping.
    public enum StatementItemType
    {
        OnlineTicketSale = 1,       // Gross fare collected online on the operator's behalf.
        PlatformCommission = 2,     // Our cut of an online sale.
        GatewayCharge = 3,          // Payment gateway's processing fee.
        Refund = 4,
        CancellationFee = 5,
        CounterSaleCommission = 6,  // What an operator owes us for using our ERP at their counter.
        ManualAdjustment = 7,       // A manual correction entered by staff.
        Tax = 8,
        Payout = 9                 // Money actually paid out to the operator.
    }

    public enum InvoiceStatus
    {
        Draft = 1,
        Issued = 2,
        PartiallyPaid = 3,
        Paid = 4,
        Cancelled = 5
    }

    public enum PayoutStatus
    {
        Pending = 1,
        Processing = 2,
        Paid = 3,
        Failed = 4,
        Cancelled = 5
    }

    // What kind of movement happened on a CUSTOMER's in-app wallet (separate from the
    // operator-side commission wallet).
    public enum CustomerWalletTransactionType
    {
        TopUp = 1,           // Customer added their own money in.
        BookingPayment = 2,  // Spent on a booking.
        RefundCredit = 3,    // A refund was credited back into the wallet instead of the original
                              // payment method.
        AdminAdjustment = 4  // Manual correction by staff.
    }

    // A bitmask (each day is its own bit) so a Schedule can say "runs on Mon/Wed/Fri" as one
    // number instead of needing 7 separate true/false columns.
    [Flags]
    public enum DayOfWeekFlag
    {
        None = 0,
        Sunday = 1,
        Monday = 2,
        Tuesday = 4,
        Wednesday = 8,
        Thursday = 16,
        Friday = 32,
        Saturday = 64,
        Everyday = Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
    }
}

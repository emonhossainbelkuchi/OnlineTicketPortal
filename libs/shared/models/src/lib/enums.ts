// Mirrors Models/Enums/ModelEnums.cs on the backend. Kept as string unions
// (not numeric TS enums) because the API serializes enums as their PascalCase
// name by default — do NOT switch these to numbers without checking
// Program.cs's JsonSerializerOptions first.

export type TripStatus =
  | "Scheduled"
  | "Boarding"
  | "Departed"
  | "Running"
  | "Arrived"
  | "Completed"
  | "Delayed"
  | "Cancelled";

export type TripSeatStatus =
  | "Available"
  | "Held"
  | "Booked"
  | "Blocked"
  | "Cancelled";

export type SeatHoldStatus =
  | "Active"
  | "ConvertedToBooking"
  | "Expired"
  | "Released"
  | "Cancelled";

export type BookingStatus =
  | "Draft"
  | "PendingPayment"
  | "Confirmed"
  | "Completed"
  | "PartiallyCancelled"
  | "Cancelled"
  | "Expired"
  | "Failed"
  | "Refunded";

export type TicketStatus =
  | "PendingPayment"
  | "Issued"
  | "CheckedIn"
  | "Used"
  | "Cancelled"
  | "Refunded"
  | "NoShow";

export type BookingSource =
  | "Web"
  | "MobileApp"
  | "Counter"
  | "Agent"
  | "Admin"
  | "ExternalApi";

export type SaleChannel =
  | "Online"
  | "Counter"
  | "Agent"
  | "Admin"
  | "ExternalApi";

export type MoneyCollectedBy = "Platform" | "Operator" | "Agent" | "Unknown";

export type OperatorInventoryMode =
  | "PlatformManaged"
  | "ExternalApiManaged"
  | "Hybrid";

export type PaymentStatus =
  | "Initiated"
  | "Pending"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "PartiallyRefunded"
  | "Refunded"
  | "ReconciliationNeeded";

export type RefundStatus =
  | "Requested"
  | "Approved"
  | "Processing"
  | "Succeeded"
  | "Rejected"
  | "Failed"
  | "PendingManualPayout"
  | "ReconciliationNeeded";

export type PaymentMethod =
  | "Cash"
  | "Card"
  | "MobileBanking"
  | "BankTransfer"
  | "OnlineGateway"
  | "Wallet";

export type PaymentGateway =
  | "None"
  | "SslCommerz"
  | "Bkash"
  | "Nagad"
  | "Rocket"
  | "Stripe"
  | "PayPal"
  | "Visa"
  | "MasterCard"
  | "Manual";

export type Gender = "Unknown" | "Male" | "Female" | "Other";

export type PassengerType = "Adult" | "Child" | "Senior" | "Student";

export type BusType =
  | "NonAc"
  | "Ac"
  | "Sleeper"
  | "DoubleDecker"
  | "BusinessClass"
  | "Economy"
  | "Luxury";

export type SeatType =
  | "Regular"
  | "Window"
  | "Aisle"
  | "Middle"
  | "Sleeper"
  | "Business";

export type CancellationRequestStatus =
  | "Requested"
  | "Approved"
  | "Rejected"
  | "Completed";

export type SettlementDirection =
  | "PlatformPaysOperator"
  | "OperatorPaysPlatform"
  | "NetZero";

export type SettlementStatus =
  | "Draft"
  | "Approved"
  | "Invoiced"
  | "Paid"
  | "Cancelled";

export type CouponType = "FixedAmount" | "Percentage";

export type CustomerWalletTransactionType =
  | "TopUp"
  | "BookingPayment"
  | "RefundCredit"
  | "AdminAdjustment";

// --- Added for Piece 4 (Operator & Fleet Management Panel) ---

// A staff member's JOB/function for HR/reporting — NOT the login role (see AppRole in
// role.model.ts). 'Operator' here means "this operator's own management/back-office staff",
// distinct from the AppRole string 'Operator' used for login/JWT roles.
export type StaffRole =
  | "SuperAdmin"
  | "Admin"
  | "Manager"
  | "Operator"
  | "CounterStaff"
  | "BusOwner"
  | "Driver"
  | "Supervisor"
  | "Helper"
  | "Finance";

// A staff member's role specifically while assigned to one trip (see TripCrew).
export type CrewRole = "Driver" | "AssistantDriver" | "Supervisor" | "Helper";

// Driving license class required to operate a given bus.
export type LicenseType = "Light" | "Heavy" | "Commercial";

// A bitmask enum (see Models/Enums/ModelEnums.cs -> DayOfWeekFlag) — the backend's
// JsonStringEnumConverter serializes/parses a combination as a comma-joined string, e.g.
// "Monday, Wednesday, Friday" or "Everyday" for the full-week shorthand. Build/parse this with
// the DAY_OF_WEEK_FLAGS helper below rather than hand-rolling the join/split.
export type DayOfWeekFlagName =
  | "None"
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Everyday";

// The seven real day names a UI should render as checkboxes — deliberately excludes the
// 'None'/'Everyday' shorthands, which are derived, not picked directly.
export const DAY_OF_WEEK_FLAGS: readonly Exclude<
  DayOfWeekFlagName,
  "None" | "Everyday"
>[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// --- Added for Piece 5 (Counter & Agent Operations Panel) ---

// Mirrors ModelEnums.cs -> AttendanceStatus.
export type AttendanceStatus = "Present" | "Absent" | "OnLeave";

// Mirrors ModelEnums.cs -> ComplaintStatus.
export type ComplaintStatus = "Open" | "InProgress" | "Resolved" | "Closed";

// --- Added for Piece 6 (Finance & Settlement Panel) ---

export type CommissionType = "Percentage" | "FixedAmount";

// For an online sale, who actually pays the payment gateway's processing fee.
export type GatewayFeeBearer = "Platform" | "Operator" | "Customer";

// What kind of financial event one ledger/statement line represents.
export type StatementItemType =
  | "OnlineTicketSale"
  | "PlatformCommission"
  | "GatewayCharge"
  | "Refund"
  | "CancellationFee"
  | "CounterSaleCommission"
  | "ManualAdjustment"
  | "Tax"
  | "Payout";

export type InvoiceStatus =
  | "Draft"
  | "Issued"
  | "PartiallyPaid"
  | "Paid"
  | "Cancelled";

export type PayoutStatus =
  | "Pending"
  | "Processing"
  | "Paid"
  | "Failed"
  | "Cancelled";

// A broader family/category for a PaymentProvider row (group "all mobile banking
// providers", "all card networks", etc).
export type PaymentProviderKind =
  | "Gateway"
  | "MobileBanking"
  | "CardNetwork"
  | "Bank"
  | "Cash"
  | "Wallet";

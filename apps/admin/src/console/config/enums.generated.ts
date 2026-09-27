// AUTO-GENERATED from Models/Enums/ModelEnums.cs
export const ENUMS: Record<string, string[]> = {
 "BusType": [
  "NonAc",
  "Ac",
  "Sleeper",
  "DoubleDecker",
  "BusinessClass",
  "Economy",
  "Luxury"
 ],
 "SeatType": [
  "Regular",
  "Window",
  "Aisle",
  "Middle",
  "Sleeper",
  "Business"
 ],
 "TripStatus": [
  "Scheduled",
  "Boarding",
  "Departed",
  "Running",
  "Arrived",
  "Completed",
  "Delayed",
  "Cancelled"
 ],
 "TripSeatStatus": [
  "Available",
  "Held",
  "Booked",
  "Blocked",
  "Cancelled"
 ],
 "SeatHoldStatus": [
  "Active",
  "ConvertedToBooking",
  "Expired",
  "Released",
  "Cancelled"
 ],
 "BookingStatus": [
  "Draft",
  "PendingPayment",
  "Confirmed",
  "Completed",
  "PartiallyCancelled",
  "Cancelled",
  "Expired",
  "Failed",
  "Refunded"
 ],
 "TicketStatus": [
  "PendingPayment",
  "Issued",
  "CheckedIn",
  "Used",
  "Cancelled",
  "Refunded",
  "NoShow"
 ],
 "BookingSource": [
  "Web",
  "MobileApp",
  "Counter",
  "Agent",
  "Admin",
  "ExternalApi"
 ],
 "SaleChannel": [
  "Online",
  "Counter",
  "Agent",
  "Admin",
  "ExternalApi"
 ],
 "MoneyCollectedBy": [
  "Platform",
  "Operator",
  "Agent",
  "Unknown"
 ],
 "OperatorInventoryMode": [
  "PlatformManaged",
  "ExternalApiManaged",
  "Hybrid"
 ],
 "PaymentStatus": [
  "Initiated",
  "Pending",
  "Succeeded",
  "Failed",
  "Cancelled",
  "PartiallyRefunded",
  "Refunded",
  "ReconciliationNeeded"
 ],
 "RefundStatus": [
  "Requested",
  "Approved",
  "Processing",
  "Succeeded",
  "Rejected",
  "Failed",
  "PendingManualPayout",
  "ReconciliationNeeded"
 ],
 "PaymentMethod": [
  "Cash",
  "Card",
  "MobileBanking",
  "BankTransfer",
  "OnlineGateway",
  "Wallet"
 ],
 "PaymentGateway": [
  "None",
  "SslCommerz",
  "Bkash",
  "Nagad",
  "Rocket",
  "Stripe",
  "PayPal",
  "Visa",
  "MasterCard",
  "Manual"
 ],
 "PaymentProviderKind": [
  "Gateway",
  "MobileBanking",
  "CardNetwork",
  "Bank",
  "Cash",
  "Wallet"
 ],
 "Gender": [
  "Unknown",
  "Male",
  "Female",
  "Other"
 ],
 "PassengerType": [
  "Adult",
  "Child",
  "Senior",
  "Student"
 ],
 "StaffRole": [
  "SuperAdmin",
  "Admin",
  "Manager",
  "Operator",
  "CounterStaff",
  "BusOwner",
  "Driver",
  "Supervisor",
  "Helper",
  "Finance"
 ],
 "CrewRole": [
  "Driver",
  "AssistantDriver",
  "Supervisor",
  "Helper"
 ],
 "CouponType": [
  "FixedAmount",
  "Percentage"
 ],
 "CancellationRequestStatus": [
  "Requested",
  "Approved",
  "Rejected",
  "Completed"
 ],
 "NotificationChannel": [
  "Email",
  "Sms",
  "WhatsApp",
  "Push"
 ],
 "NotificationStatus": [
  "Queued",
  "Sent",
  "Failed"
 ],
 "OfferStatus": [
  "Active",
  "Expired",
  "Disabled"
 ],
 "ComplaintStatus": [
  "Open",
  "InProgress",
  "Resolved",
  "Closed"
 ],
 "VehicleFuelType": [
  "Diesel",
  "Petrol",
  "Cng",
  "Electric",
  "Hybrid"
 ],
 "LicenseType": [
  "Light",
  "Heavy",
  "Commercial"
 ],
 "AttendanceStatus": [
  "Present",
  "Absent",
  "OnLeave"
 ],
 "IntegrationAuthType": [
  "None",
  "ApiKey",
  "BearerToken",
  "Basic",
  "OAuth2"
 ],
 "IntegrationSyncStatus": [
  "Pending",
  "Succeeded",
  "Failed",
  "Retrying",
  "Skipped"
 ],
 "CommissionType": [
  "Percentage",
  "FixedAmount"
 ],
 "GatewayFeeBearer": [
  "Platform",
  "Operator",
  "Customer"
 ],
 "SettlementDirection": [
  "PlatformPaysOperator",
  "OperatorPaysPlatform",
  "NetZero"
 ],
 "SettlementStatus": [
  "Draft",
  "Approved",
  "Invoiced",
  "Paid",
  "Cancelled"
 ],
 "StatementItemType": [
  "OnlineTicketSale",
  "PlatformCommission",
  "GatewayCharge",
  "Refund",
  "CancellationFee",
  "CounterSaleCommission",
  "ManualAdjustment",
  "Tax",
  "Payout"
 ],
 "InvoiceStatus": [
  "Draft",
  "Issued",
  "PartiallyPaid",
  "Paid",
  "Cancelled"
 ],
 "PayoutStatus": [
  "Pending",
  "Processing",
  "Paid",
  "Failed",
  "Cancelled"
 ],
 "CustomerWalletTransactionType": [
  "TopUp",
  "BookingPayment",
  "RefundCredit",
  "AdminAdjustment"
 ],
 "DayOfWeekFlag": [
  "None",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
 ]
};

// Type aliases used by a few pages (`x as BusType`); the value lists live in ENUMS above.
export type BusType = string;
export type SeatType = string;

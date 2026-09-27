// AUTO-GENERATED from the actual ASP.NET Core API source (Controllers + DTO + Enums).
// Every field/action here mirrors the real backend contract -- nothing invented.
export type FieldKind = 'text'|'number'|'checkbox'|'datetime'|'select';
export interface ResourceField { name: string; type: string; kind: FieldKind; options?: string[]|null; required: boolean; label: string }
export interface WorkflowAction { verb: string; path: string; label: string; fields: ResourceField[]; isCreate: boolean }
export interface ResourceConfig { key: string; label: string; base: string; hasStdCrud: boolean; standardFields: ResourceField[]; workflowActions: WorkflowAction[]; readOnly: boolean; hasImageUpload: boolean }
export const RESOURCES: Record<string, ResourceConfig> = {
 "ActivityLogs": {
  "key": "ActivityLogs",
  "label": "Activity Logs",
  "base": "api/ActivityLogs",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Agents": {
  "key": "Agents",
  "label": "Agents",
  "base": "api/Agents",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Operator Id"
   },
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "AgencyCode",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Agency Code"
   },
   {
    "name": "ContactPerson",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Contact Person"
   },
   {
    "name": "PhoneNumber",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Phone Number"
   },
   {
    "name": "Email",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Email"
   },
   {
    "name": "Address",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Address"
   },
   {
    "name": "CommissionPercentage",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Commission Percentage"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "AuditLogs": {
  "key": "AuditLogs",
  "label": "Audit Logs",
  "base": "api/AuditLogs",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Bookings": {
  "key": "Bookings",
  "label": "Bookings",
  "base": "api/Bookings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "TripId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Id"
   },
   {
    "name": "HoldToken",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Hold Token"
   },
   {
    "name": "BoardingTerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Boarding Terminal Id"
   },
   {
    "name": "DroppingTerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Dropping Terminal Id"
   },
   {
    "name": "ContactName",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Contact Name"
   },
   {
    "name": "ContactPhone",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Contact Phone"
   },
   {
    "name": "ContactEmail",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Contact Email"
   },
   {
    "name": "SalesCounterId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Sales Counter Id"
   },
   {
    "name": "Passengers",
    "type": "List<BookingPassengerCreateDto>",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Passengers"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{bookingId}/passengers/{passengerId}/images",
    "label": "Images",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "BusAmenities": {
  "key": "BusAmenities",
  "label": "Bus Amenities",
  "base": "api/BusAmenities",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "IconUrl",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Icon Url"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "BusAmenityMappings": {
  "key": "BusAmenityMappings",
  "label": "Bus Amenity Mappings",
  "base": "api/BusAmenityMappings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Id"
   },
   {
    "name": "BusAmenityId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Amenity Id"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "BusCategories": {
  "key": "BusCategories",
  "label": "Bus Categories",
  "base": "api/BusCategories",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "BusImages": {
  "key": "BusImages",
  "label": "Bus Images",
  "base": "api/BusImages",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Id"
   },
   {
    "name": "ImageUrl",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Image Url"
   },
   {
    "name": "Caption",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Caption"
   },
   {
    "name": "IsPrimary",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Primary"
   },
   {
    "name": "DisplayOrder",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Display Order"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "BusMaintenanceLogs": {
  "key": "BusMaintenanceLogs",
  "label": "Bus Maintenance Logs",
  "base": "api/BusMaintenanceLogs",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Id"
   },
   {
    "name": "MaintenanceDateUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Maintenance Date Utc"
   },
   {
    "name": "OdometerKm",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Odometer Km"
   },
   {
    "name": "Title",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Title"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   },
   {
    "name": "Cost",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Cost"
   },
   {
    "name": "NextDueDateUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Next Due Date Utc"
   },
   {
    "name": "PerformedBy",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Performed By"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "BusOperators": {
  "key": "BusOperators",
  "label": "Bus Operators",
  "base": "api/BusOperators",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "LegalName",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Legal Name"
   },
   {
    "name": "RegistrationNumber",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Registration Number"
   },
   {
    "name": "ContactPhone",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Contact Phone"
   },
   {
    "name": "Email",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Email"
   },
   {
    "name": "AddressLine",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Address Line"
   },
   {
    "name": "City",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "City"
   },
   {
    "name": "District",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "District"
   },
   {
    "name": "Country",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Country"
   },
   {
    "name": "FoundedYear",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Founded Year"
   },
   {
    "name": "RegisteredOnUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Registered On Utc"
   },
   {
    "name": "InventoryMode",
    "type": "OperatorInventoryMode",
    "kind": "select",
    "options": [
     "PlatformManaged",
     "ExternalApiManaged",
     "Hybrid"
    ],
    "required": true,
    "label": "Inventory Mode"
   },
   {
    "name": "OperatorRoutes",
    "type": "List<OperatorRouteCreateDto>",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Routes"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/images",
    "label": "Images",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": true
 },
 "BusRoutes": {
  "key": "BusRoutes",
  "label": "Bus Routes",
  "base": "api/BusRoutes",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OriginTerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Origin Terminal Id"
   },
   {
    "name": "DestinationTerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Destination Terminal Id"
   },
   {
    "name": "ReverseRouteId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Reverse Route Id"
   },
   {
    "name": "RouteCode",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Route Code"
   },
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "DistanceKm",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Distance Km"
   },
   {
    "name": "EstimatedDurationMinutes",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Estimated Duration Minutes"
   },
   {
    "name": "DefaultBaseFare",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Default Base Fare"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Buses": {
  "key": "Buses",
  "label": "Buses",
  "base": "api/Buses",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "BusCategoryId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Category Id"
   },
   {
    "name": "RegistrationNumber",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Registration Number"
   },
   {
    "name": "CoachNumber",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Coach Number"
   },
   {
    "name": "Brand",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Brand"
   },
   {
    "name": "Model",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Model"
   },
   {
    "name": "RegistrationDate",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Registration Date"
   },
   {
    "name": "BusType",
    "type": "BusType",
    "kind": "select",
    "options": [
     "NonAc",
     "Ac",
     "Sleeper",
     "DoubleDecker",
     "BusinessClass",
     "Economy",
     "Luxury"
    ],
    "required": true,
    "label": "Bus Type"
   },
   {
    "name": "TotalSeats",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Total Seats"
   },
   {
    "name": "HasWifi",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Has Wifi"
   },
   {
    "name": "HasToilet",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Has Toilet"
   },
   {
    "name": "Seats",
    "type": "List<SeatCreateDto>",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Seats"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/images",
    "label": "Images",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": true
 },
 "CancellationPolicies": {
  "key": "CancellationPolicies",
  "label": "Cancellation Policies",
  "base": "api/CancellationPolicies",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Operator Id"
   },
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   },
   {
    "name": "EffectiveFromUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Effective From Utc"
   },
   {
    "name": "EffectiveToUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Effective To Utc"
   },
   {
    "name": "Rules",
    "type": "List<CancellationPolicyRuleCreateDto>",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Rules"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/images",
    "label": "Images",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": true
 },
 "CancellationRequests": {
  "key": "CancellationRequests",
  "label": "Cancellation Requests",
  "base": "api/CancellationRequests",
  "hasStdCrud": false,
  "standardFields": [
   {
    "name": "BookingId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Booking Id"
   },
   {
    "name": "TicketId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Ticket Id"
   },
   {
    "name": "Reason",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Reason"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/approve",
    "label": "Approve",
    "fields": [
     {
      "name": "ApprovedRefundAmount",
      "type": "decimal?",
      "kind": "number",
      "options": null,
      "required": false,
      "label": "Approved Refund Amount"
     },
     {
      "name": "Remarks",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Remarks"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/reject",
    "label": "Reject",
    "fields": [
     {
      "name": "RejectedReason",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Rejected Reason"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/complete",
    "label": "Complete",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "CommissionRules": {
  "key": "CommissionRules",
  "label": "Commission Rules",
  "base": "api/CommissionRules",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "OperatorContractId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Operator Contract Id"
   },
   {
    "name": "BusRouteId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Route Id"
   },
   {
    "name": "SaleChannel",
    "type": "SaleChannel",
    "kind": "select",
    "options": [
     "Online",
     "Counter",
     "Agent",
     "Admin",
     "ExternalApi"
    ],
    "required": true,
    "label": "Sale Channel"
   },
   {
    "name": "CommissionType",
    "type": "CommissionType",
    "kind": "select",
    "options": [
     "Percentage",
     "FixedAmount"
    ],
    "required": true,
    "label": "Commission Type"
   },
   {
    "name": "CommissionValue",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Commission Value"
   },
   {
    "name": "EffectiveFrom",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Effective From"
   },
   {
    "name": "EffectiveTo",
    "type": "DateOnly?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Effective To"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Complaints": {
  "key": "Complaints",
  "label": "Complaints",
  "base": "api/Complaints",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BookingId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Booking Id"
   },
   {
    "name": "Subject",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Subject"
   },
   {
    "name": "Description",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Description"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/status",
    "label": "Status",
    "fields": [
     {
      "name": "Status",
      "type": "ComplaintStatus",
      "kind": "select",
      "options": [
       "Open",
       "InProgress",
       "Resolved",
       "Closed"
      ],
      "required": true,
      "label": "Status"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "CouponUsages": {
  "key": "CouponUsages",
  "label": "Coupon Usages",
  "base": "api/CouponUsages",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "redeem",
    "label": "Redeem",
    "fields": [
     {
      "name": "Code",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Code"
     },
     {
      "name": "BookingId",
      "type": "Guid",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Booking Id"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Coupons": {
  "key": "Coupons",
  "label": "Coupons",
  "base": "api/Coupons",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Code",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Code"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   },
   {
    "name": "Type",
    "type": "CouponType",
    "kind": "select",
    "options": [
     "FixedAmount",
     "Percentage"
    ],
    "required": true,
    "label": "Type"
   },
   {
    "name": "DiscountAmount",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Discount Amount"
   },
   {
    "name": "DiscountPercentage",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Discount Percentage"
   },
   {
    "name": "MaxDiscountAmount",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Max Discount Amount"
   },
   {
    "name": "MinBookingAmount",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Min Booking Amount"
   },
   {
    "name": "UsageLimit",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Usage Limit"
   },
   {
    "name": "PerUserLimit",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Per User Limit"
   },
   {
    "name": "ValidFromUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Valid From Utc"
   },
   {
    "name": "ValidToUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Valid To Utc"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Currencies": {
  "key": "Currencies",
  "label": "Currencies",
  "base": "api/Currencies",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Code",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Code"
   },
   {
    "name": "Symbol",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Symbol"
   },
   {
    "name": "ExchangeRateToBase",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Exchange Rate To Base"
   },
   {
    "name": "IsBaseCurrency",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Base Currency"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "CustomerAddresses": {
  "key": "CustomerAddresses",
  "label": "Customer Addresses",
  "base": "api/CustomerAddresses",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Label",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Label"
   },
   {
    "name": "AddressLine",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Address Line"
   },
   {
    "name": "City",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "City"
   },
   {
    "name": "District",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "District"
   },
   {
    "name": "Country",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Country"
   },
   {
    "name": "IsDefault",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Default"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "CustomerProfiles": {
  "key": "CustomerProfiles",
  "label": "Customer Profiles",
  "base": "api/CustomerProfiles",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "UserId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "User Id"
   },
   {
    "name": "NationalIdNumber",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "National Id Number"
   },
   {
    "name": "DateOfBirth",
    "type": "DateOnly?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Date Of Birth"
   },
   {
    "name": "Gender",
    "type": "Gender",
    "kind": "select",
    "options": [
     "Unknown",
     "Male",
     "Female",
     "Other"
    ],
    "required": true,
    "label": "Gender"
   },
   {
    "name": "EmergencyContactPhone",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Emergency Contact Phone"
   },
   {
    "name": "PreferredLanguageCode",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Preferred Language Code"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "CustomerWalletTransactions": {
  "key": "CustomerWalletTransactions",
  "label": "Customer Wallet Transactions",
  "base": "api/CustomerWalletTransactions",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "DriverLicenses": {
  "key": "DriverLicenses",
  "label": "Driver Licenses",
  "base": "api/DriverLicenses",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "StaffProfileId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Staff Profile Id"
   },
   {
    "name": "LicenseNumber",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "License Number"
   },
   {
    "name": "Type",
    "type": "LicenseType",
    "kind": "select",
    "options": [
     "Light",
     "Heavy",
     "Commercial"
    ],
    "required": true,
    "label": "Type"
   },
   {
    "name": "IssueDate",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Issue Date"
   },
   {
    "name": "ExpiryDate",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Expiry Date"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "EmergencyContacts": {
  "key": "EmergencyContacts",
  "label": "Emergency Contacts",
  "base": "api/EmergencyContacts",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "Phone",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Phone"
   },
   {
    "name": "Relation",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Relation"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "ExternalBookingMappings": {
  "key": "ExternalBookingMappings",
  "label": "External Booking Mappings",
  "base": "api/ExternalBookingMappings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OperatorIntegrationId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Integration Id"
   },
   {
    "name": "BookingId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Booking Id"
   },
   {
    "name": "ExternalBookingKey",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "External Booking Key"
   },
   {
    "name": "ExternalPnr",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "External Pnr"
   },
   {
    "name": "LastKnownExternalStatus",
    "type": "BookingStatus?",
    "kind": "select",
    "options": [
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
    "required": false,
    "label": "Last Known External Status"
   },
   {
    "name": "LastSyncedAtUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Last Synced At Utc"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "ExternalRouteMappings": {
  "key": "ExternalRouteMappings",
  "label": "External Route Mappings",
  "base": "api/ExternalRouteMappings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OperatorIntegrationId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Integration Id"
   },
   {
    "name": "OperatorRouteId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Route Id"
   },
   {
    "name": "ExternalRouteKey",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "External Route Key"
   },
   {
    "name": "ExternalRouteName",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "External Route Name"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "ExternalSeatMappings": {
  "key": "ExternalSeatMappings",
  "label": "External Seat Mappings",
  "base": "api/ExternalSeatMappings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OperatorIntegrationId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Integration Id"
   },
   {
    "name": "TripSeatId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Seat Id"
   },
   {
    "name": "ExternalSeatKey",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "External Seat Key"
   },
   {
    "name": "ExternalSeatNumber",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "External Seat Number"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "ExternalTripMappings": {
  "key": "ExternalTripMappings",
  "label": "External Trip Mappings",
  "base": "api/ExternalTripMappings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OperatorIntegrationId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Integration Id"
   },
   {
    "name": "TripId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Id"
   },
   {
    "name": "ExternalTripKey",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "External Trip Key"
   },
   {
    "name": "LastSyncedAtUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Last Synced At Utc"
   },
   {
    "name": "LastSeatSnapshotJson",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Last Seat Snapshot Json"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "FareRules": {
  "key": "FareRules",
  "label": "Fare Rules",
  "base": "api/FareRules",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Operator Id"
   },
   {
    "name": "BusRouteId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Route Id"
   },
   {
    "name": "BusType",
    "type": "BusType?",
    "kind": "select",
    "options": [
     "NonAc",
     "Ac",
     "Sleeper",
     "DoubleDecker",
     "BusinessClass",
     "Economy",
     "Luxury"
    ],
    "required": false,
    "label": "Bus Type"
   },
   {
    "name": "SeatType",
    "type": "SeatType?",
    "kind": "select",
    "options": [
     "Regular",
     "Window",
     "Aisle",
     "Middle",
     "Sleeper",
     "Business"
    ],
    "required": false,
    "label": "Seat Type"
   },
   {
    "name": "BaseFare",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Base Fare"
   },
   {
    "name": "Currency",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Currency"
   },
   {
    "name": "EffectiveFromUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Effective From Utc"
   },
   {
    "name": "EffectiveToUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Effective To Utc"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "IntegrationSyncLogs": {
  "key": "IntegrationSyncLogs",
  "label": "Integration Sync Logs",
  "base": "api/IntegrationSyncLogs",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "IntegrationWebhookLogs": {
  "key": "IntegrationWebhookLogs",
  "label": "Integration Webhook Logs",
  "base": "api/IntegrationWebhookLogs",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Languages": {
  "key": "Languages",
  "label": "Languages",
  "base": "api/Languages",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Code",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Code"
   },
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "IsDefault",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Default"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "LoginHistories": {
  "key": "LoginHistories",
  "label": "Login Histories",
  "base": "api/LoginHistories",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "NotificationLogs": {
  "key": "NotificationLogs",
  "label": "Notification Logs",
  "base": "api/NotificationLogs",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Offers": {
  "key": "Offers",
  "label": "Offers",
  "base": "api/Offers",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Operator Id"
   },
   {
    "name": "Title",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Title"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   },
   {
    "name": "Status",
    "type": "OfferStatus",
    "kind": "select",
    "options": [
     "Active",
     "Expired",
     "Disabled"
    ],
    "required": true,
    "label": "Status"
   },
   {
    "name": "StartDateUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Start Date Utc"
   },
   {
    "name": "EndDateUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "End Date Utc"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorBranches": {
  "key": "OperatorBranches",
  "label": "Operator Branches",
  "base": "api/OperatorBranches",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "BranchName",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Branch Name"
   },
   {
    "name": "Address",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Address"
   },
   {
    "name": "Phone",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Phone"
   },
   {
    "name": "City",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "City"
   },
   {
    "name": "District",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "District"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorContracts": {
  "key": "OperatorContracts",
  "label": "Operator Contracts",
  "base": "api/OperatorContracts",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "ContractNo",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Contract No"
   },
   {
    "name": "EffectiveFrom",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Effective From"
   },
   {
    "name": "EffectiveTo",
    "type": "DateOnly?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Effective To"
   },
   {
    "name": "SettlementIntervalDays",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Settlement Interval Days"
   },
   {
    "name": "GatewayFeeBearer",
    "type": "GatewayFeeBearer",
    "kind": "select",
    "options": [
     "Platform",
     "Operator",
     "Customer"
    ],
    "required": true,
    "label": "Gateway Fee Bearer"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   },
   {
    "name": "Notes",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Notes"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorIntegrationEndpoints": {
  "key": "OperatorIntegrationEndpoints",
  "label": "Operator Integration Endpoints",
  "base": "api/OperatorIntegrationEndpoints",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OperatorIntegrationId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Integration Id"
   },
   {
    "name": "Purpose",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Purpose"
   },
   {
    "name": "HttpMethod",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Http Method"
   },
   {
    "name": "PathTemplate",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Path Template"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorIntegrations": {
  "key": "OperatorIntegrations",
  "label": "Operator Integrations",
  "base": "api/OperatorIntegrations",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "BaseUrl",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Base Url"
   },
   {
    "name": "AuthType",
    "type": "IntegrationAuthType",
    "kind": "select",
    "options": [
     "None",
     "ApiKey",
     "BearerToken",
     "Basic",
     "OAuth2"
    ],
    "required": true,
    "label": "Auth Type"
   },
   {
    "name": "ApiKeyHeaderName",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Api Key Header Name"
   },
   {
    "name": "SecretReference",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Secret Reference"
   },
   {
    "name": "TimeoutSeconds",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Timeout Seconds"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   },
   {
    "name": "LastSuccessfulSyncAtUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Last Successful Sync At Utc"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorInvoices": {
  "key": "OperatorInvoices",
  "label": "Operator Invoices",
  "base": "api/OperatorInvoices",
  "hasStdCrud": false,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "OperatorStatementId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Operator Statement Id"
   },
   {
    "name": "InvoiceDate",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Invoice Date"
   },
   {
    "name": "DueDate",
    "type": "DateOnly?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Due Date"
   },
   {
    "name": "Direction",
    "type": "SettlementDirection",
    "kind": "select",
    "options": [
     "PlatformPaysOperator",
     "OperatorPaysPlatform",
     "NetZero"
    ],
    "required": true,
    "label": "Direction"
   },
   {
    "name": "Amount",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Amount"
   },
   {
    "name": "Currency",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Currency"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/issue",
    "label": "Issue",
    "fields": [],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/cancel",
    "label": "Cancel",
    "fields": [
     {
      "name": "Reason",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Reason"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorPaymentReceipts": {
  "key": "OperatorPaymentReceipts",
  "label": "Operator Payment Receipts",
  "base": "api/OperatorPaymentReceipts",
  "hasStdCrud": false,
  "standardFields": [
   {
    "name": "OperatorInvoiceId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Invoice Id"
   },
   {
    "name": "Amount",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Amount"
   },
   {
    "name": "Currency",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Currency"
   },
   {
    "name": "ReferenceNo",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Reference No"
   },
   {
    "name": "Notes",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Notes"
   }
  ],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "OperatorPayouts": {
  "key": "OperatorPayouts",
  "label": "Operator Payouts",
  "base": "api/OperatorPayouts",
  "hasStdCrud": false,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "OperatorSettlementId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Operator Settlement Id"
   },
   {
    "name": "Amount",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Amount"
   },
   {
    "name": "Currency",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Currency"
   },
   {
    "name": "Notes",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Notes"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/process",
    "label": "Process",
    "fields": [],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/complete",
    "label": "Complete",
    "fields": [
     {
      "name": "BankTransactionReference",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Bank Transaction Reference"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/fail",
    "label": "Fail",
    "fields": [
     {
      "name": "Reason",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Reason"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/cancel",
    "label": "Cancel",
    "fields": [
     {
      "name": "Reason",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Reason"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorRouteStops": {
  "key": "OperatorRouteStops",
  "label": "Operator Route Stops",
  "base": "api/OperatorRouteStops",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "OperatorRouteId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Operator Route Id"
   },
   {
    "name": "TerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Terminal Id"
   },
   {
    "name": "StopOrder",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Stop Order"
   },
   {
    "name": "ArrivalOffsetMinutes",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Arrival Offset Minutes"
   },
   {
    "name": "DepartureOffsetMinutes",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Departure Offset Minutes"
   },
   {
    "name": "IsPickupPoint",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Pickup Point"
   },
   {
    "name": "IsDropOffPoint",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Drop Off Point"
   },
   {
    "name": "ExternalStopKey",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "External Stop Key"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorSettings": {
  "key": "OperatorSettings",
  "label": "Operator Settings",
  "base": "api/OperatorSettings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "Key",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Key"
   },
   {
    "name": "Value",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Value"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorSettlementItems": {
  "key": "OperatorSettlementItems",
  "label": "Operator Settlement Items",
  "base": "api/OperatorSettlementItems",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "OperatorSettlements": {
  "key": "OperatorSettlements",
  "label": "Operator Settlements",
  "base": "api/OperatorSettlements",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "generate",
    "label": "Generate",
    "fields": [
     {
      "name": "BusOperatorId",
      "type": "Guid",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Bus Operator Id"
     },
     {
      "name": "FromDate",
      "type": "DateOnly",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "From Date"
     },
     {
      "name": "ToDate",
      "type": "DateOnly",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "To Date"
     },
     {
      "name": "Remarks",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Remarks"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/approve",
    "label": "Approve",
    "fields": [
     {
      "name": "Remarks",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Remarks"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "OperatorStatementItems": {
  "key": "OperatorStatementItems",
  "label": "Operator Statement Items",
  "base": "api/OperatorStatementItems",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "OperatorStatements": {
  "key": "OperatorStatements",
  "label": "Operator Statements",
  "base": "api/OperatorStatements",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "OperatorWallets": {
  "key": "OperatorWallets",
  "label": "Operator Wallets",
  "base": "api/OperatorWallets",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "PaymentHistories": {
  "key": "PaymentHistories",
  "label": "Payment Histories",
  "base": "api/PaymentHistories",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "PaymentMethodConfigurations": {
  "key": "PaymentMethodConfigurations",
  "label": "Payment Method Configurations",
  "base": "api/PaymentMethodConfigurations",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "PaymentProviderId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Payment Provider Id"
   },
   {
    "name": "Method",
    "type": "PaymentMethod",
    "kind": "select",
    "options": [
     "Cash",
     "Card",
     "MobileBanking",
     "BankTransfer",
     "OnlineGateway",
     "Wallet"
    ],
    "required": true,
    "label": "Method"
   },
   {
    "name": "DisplayName",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Display Name"
   },
   {
    "name": "FixedFee",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Fixed Fee"
   },
   {
    "name": "PercentageFee",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Percentage Fee"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "PaymentProviders": {
  "key": "PaymentProviders",
  "label": "Payment Providers",
  "base": "api/PaymentProviders",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "Code",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Code"
   },
   {
    "name": "ProviderKind",
    "type": "PaymentProviderKind",
    "kind": "select",
    "options": [
     "Gateway",
     "MobileBanking",
     "CardNetwork",
     "Bank",
     "Cash",
     "Wallet"
    ],
    "required": true,
    "label": "Provider Kind"
   },
   {
    "name": "Gateway",
    "type": "PaymentGateway",
    "kind": "select",
    "options": [
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
    "required": true,
    "label": "Gateway"
   },
   {
    "name": "CheckoutBaseUrl",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Checkout Base Url"
   },
   {
    "name": "WebhookUrl",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Webhook Url"
   },
   {
    "name": "SupportsRefund",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Supports Refund"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "PaymentWebhookEvents": {
  "key": "PaymentWebhookEvents",
  "label": "Payment Webhook Events",
  "base": "api/PaymentWebhookEvents",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Payments": {
  "key": "Payments",
  "label": "Payments",
  "base": "api/Payments",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "initiate",
    "label": "Initiate",
    "fields": [
     {
      "name": "BookingId",
      "type": "Guid",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Booking Id"
     },
     {
      "name": "HoldToken",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Hold Token"
     },
     {
      "name": "Method",
      "type": "PaymentMethod",
      "kind": "select",
      "options": [
       "Cash",
       "Card",
       "MobileBanking",
       "BankTransfer",
       "OnlineGateway",
       "Wallet"
      ],
      "required": true,
      "label": "Method"
     },
     {
      "name": "PaymentProviderId",
      "type": "Guid?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Payment Provider Id"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/confirm",
    "label": "Confirm",
    "fields": [
     {
      "name": "HoldToken",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Hold Token"
     },
     {
      "name": "GatewayTransactionId",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Gateway Transaction Id"
     },
     {
      "name": "GatewayFeeAmount",
      "type": "decimal",
      "kind": "number",
      "options": null,
      "required": true,
      "label": "Gateway Fee Amount"
     },
     {
      "name": "GatewayResponseJson",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Gateway Response Json"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/fail",
    "label": "Fail",
    "fields": [
     {
      "name": "HoldToken",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Hold Token"
     },
     {
      "name": "Reason",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Reason"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "counter-sale/confirm",
    "label": "Confirm",
    "fields": [
     {
      "name": "BookingId",
      "type": "Guid",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Booking Id"
     },
     {
      "name": "HoldToken",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Hold Token"
     },
     {
      "name": "Method",
      "type": "PaymentMethod",
      "kind": "select",
      "options": [
       "Cash",
       "Card",
       "MobileBanking",
       "BankTransfer",
       "OnlineGateway",
       "Wallet"
      ],
      "required": true,
      "label": "Method"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "PlatformLedgers": {
  "key": "PlatformLedgers",
  "label": "Platform Ledgers",
  "base": "api/PlatformLedgers",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "PromoBanners": {
  "key": "PromoBanners",
  "label": "Promo Banners",
  "base": "api/PromoBanners",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "ImageUrl",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Image Url"
   },
   {
    "name": "LinkUrl",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Link Url"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   },
   {
    "name": "DisplayOrder",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Display Order"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "RefundHistories": {
  "key": "RefundHistories",
  "label": "Refund Histories",
  "base": "api/RefundHistories",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Refunds": {
  "key": "Refunds",
  "label": "Refunds",
  "base": "api/Refunds",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/approve",
    "label": "Approve",
    "fields": [
     {
      "name": "Remarks",
      "type": "string?",
      "kind": "text",
      "options": null,
      "required": false,
      "label": "Remarks"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/reject",
    "label": "Reject",
    "fields": [
     {
      "name": "Reason",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Reason"
     }
    ],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/process",
    "label": "Process",
    "fields": [],
    "isCreate": false
   },
   {
    "verb": "HttpPost",
    "path": "{id}/manual-payout",
    "label": "Manual-Payout",
    "fields": [
     {
      "name": "ManualPayoutReference",
      "type": "string",
      "kind": "text",
      "options": null,
      "required": true,
      "label": "Manual Payout Reference"
     }
    ],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Reviews": {
  "key": "Reviews",
  "label": "Reviews",
  "base": "api/Reviews",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "TripId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Id"
   },
   {
    "name": "BookingId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Booking Id"
   },
   {
    "name": "Rating",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Rating"
   },
   {
    "name": "Comment",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Comment"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "RouteStops": {
  "key": "RouteStops",
  "label": "Route Stops",
  "base": "api/RouteStops",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusRouteId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Route Id"
   },
   {
    "name": "TerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Terminal Id"
   },
   {
    "name": "StopOrder",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Stop Order"
   },
   {
    "name": "ArrivalOffsetMinutes",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Arrival Offset Minutes"
   },
   {
    "name": "DepartureOffsetMinutes",
    "type": "int?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Departure Offset Minutes"
   },
   {
    "name": "DistanceFromOriginKm",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Distance From Origin Km"
   },
   {
    "name": "IsPickupPoint",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Pickup Point"
   },
   {
    "name": "IsDropOffPoint",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Drop Off Point"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "SalesCounters": {
  "key": "SalesCounters",
  "label": "Sales Counters",
  "base": "api/SalesCounters",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "TerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Terminal Id"
   },
   {
    "name": "OperatorBranchId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Operator Branch Id"
   },
   {
    "name": "CounterName",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Counter Name"
   },
   {
    "name": "CounterCode",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Counter Code"
   },
   {
    "name": "PhoneNumber",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Phone Number"
   },
   {
    "name": "Address",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Address"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Schedules": {
  "key": "Schedules",
  "label": "Schedules",
  "base": "api/Schedules",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "BusRouteId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Route Id"
   },
   {
    "name": "OperatorRouteId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Operator Route Id"
   },
   {
    "name": "BusId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Id"
   },
   {
    "name": "ScheduleCode",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Schedule Code"
   },
   {
    "name": "DepartureTimeOfDay",
    "type": "TimeSpan",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Departure Time Of Day"
   },
   {
    "name": "ArrivalTimeOfDay",
    "type": "TimeSpan?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Arrival Time Of Day"
   },
   {
    "name": "OperatingDays",
    "type": "DayOfWeekFlag",
    "kind": "select",
    "options": [
     "None",
     "Sunday",
     "Monday",
     "Tuesday",
     "Wednesday",
     "Thursday",
     "Friday",
     "Saturday"
    ],
    "required": true,
    "label": "Operating Days"
   },
   {
    "name": "EffectiveFrom",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Effective From"
   },
   {
    "name": "EffectiveTo",
    "type": "DateOnly?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Effective To"
   },
   {
    "name": "BaseFare",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Base Fare"
   },
   {
    "name": "Currency",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Currency"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "SeatHoldItems": {
  "key": "SeatHoldItems",
  "label": "Seat Hold Items",
  "base": "api/SeatHoldItems",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "SeatHolds": {
  "key": "SeatHolds",
  "label": "Seat Holds",
  "base": "api/SeatHolds",
  "hasStdCrud": false,
  "standardFields": [
   {
    "name": "TripId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Id"
   },
   {
    "name": "TripSeatIds",
    "type": "List<Guid>",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Seat Ids"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/release",
    "label": "Release",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": false
 },
 "StaffAttendances": {
  "key": "StaffAttendances",
  "label": "Staff Attendances",
  "base": "api/StaffAttendances",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "StaffProfileId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Staff Profile Id"
   },
   {
    "name": "AttendanceDate",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Attendance Date"
   },
   {
    "name": "Status",
    "type": "AttendanceStatus",
    "kind": "select",
    "options": [
     "Present",
     "Absent",
     "OnLeave"
    ],
    "required": true,
    "label": "Status"
   },
   {
    "name": "Remarks",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Remarks"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "StaffProfiles": {
  "key": "StaffProfiles",
  "label": "Staff Profiles",
  "base": "api/StaffProfiles",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "UserId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "User Id"
   },
   {
    "name": "BusOperatorId",
    "type": "Guid?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Bus Operator Id"
   },
   {
    "name": "EmployeeCode",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Employee Code"
   },
   {
    "name": "Role",
    "type": "StaffRole",
    "kind": "select",
    "options": [
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
    "required": true,
    "label": "Role"
   },
   {
    "name": "NationalIdNumber",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "National Id Number"
   },
   {
    "name": "JoiningDate",
    "type": "DateOnly?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Joining Date"
   },
   {
    "name": "Address",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Address"
   },
   {
    "name": "TotalTripsCompleted",
    "type": "int",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Total Trips Completed"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "StaffSalaries": {
  "key": "StaffSalaries",
  "label": "Staff Salaries",
  "base": "api/StaffSalaries",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "StaffProfileId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Staff Profile Id"
   },
   {
    "name": "PayPeriodStart",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Pay Period Start"
   },
   {
    "name": "PayPeriodEnd",
    "type": "DateOnly",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Pay Period End"
   },
   {
    "name": "Amount",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Amount"
   },
   {
    "name": "IsPaid",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Paid"
   },
   {
    "name": "PaidAtUtc",
    "type": "DateTime?",
    "kind": "datetime",
    "options": null,
    "required": false,
    "label": "Paid At Utc"
   },
   {
    "name": "PaymentReference",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Payment Reference"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "SystemSettings": {
  "key": "SystemSettings",
  "label": "System Settings",
  "base": "api/SystemSettings",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Key",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Key"
   },
   {
    "name": "Value",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Value"
   },
   {
    "name": "Description",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Description"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "TaxRules": {
  "key": "TaxRules",
  "label": "Tax Rules",
  "base": "api/TaxRules",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "Percentage",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Percentage"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Terminals": {
  "key": "Terminals",
  "label": "Terminals",
  "base": "api/Terminals",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "Name",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Name"
   },
   {
    "name": "Code",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Code"
   },
   {
    "name": "City",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "City"
   },
   {
    "name": "District",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "District"
   },
   {
    "name": "Division",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Division"
   },
   {
    "name": "Country",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Country"
   },
   {
    "name": "Address",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Address"
   },
   {
    "name": "Latitude",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Latitude"
   },
   {
    "name": "Longitude",
    "type": "decimal?",
    "kind": "number",
    "options": null,
    "required": false,
    "label": "Longitude"
   },
   {
    "name": "IsActive",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Active"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "Tickets": {
  "key": "Tickets",
  "label": "Tickets",
  "base": "api/Tickets",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "TripCrews": {
  "key": "TripCrews",
  "label": "Trip Crews",
  "base": "api/TripCrews",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "TripId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Id"
   },
   {
    "name": "StaffProfileId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Staff Profile Id"
   },
   {
    "name": "Role",
    "type": "CrewRole",
    "kind": "select",
    "options": [
     "Driver",
     "AssistantDriver",
     "Supervisor",
     "Helper"
    ],
    "required": true,
    "label": "Role"
   },
   {
    "name": "AssignedAtUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Assigned At Utc"
   }
  ],
  "workflowActions": [],
  "readOnly": false,
  "hasImageUpload": false
 },
 "TripStatusHistories": {
  "key": "TripStatusHistories",
  "label": "Trip Status Histories",
  "base": "api/TripStatusHistories",
  "hasStdCrud": false,
  "standardFields": [],
  "workflowActions": [],
  "readOnly": true,
  "hasImageUpload": false
 },
 "Trips": {
  "key": "Trips",
  "label": "Trips",
  "base": "api/Trips",
  "hasStdCrud": true,
  "standardFields": [
   {
    "name": "BusOperatorId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Operator Id"
   },
   {
    "name": "BusRouteId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Route Id"
   },
   {
    "name": "BusId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Bus Id"
   },
   {
    "name": "DepartureTerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Departure Terminal Id"
   },
   {
    "name": "ArrivalTerminalId",
    "type": "Guid",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Arrival Terminal Id"
   },
   {
    "name": "TripCode",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Code"
   },
   {
    "name": "DepartureTimeUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Departure Time Utc"
   },
   {
    "name": "ArrivalTimeUtc",
    "type": "DateTime",
    "kind": "datetime",
    "options": null,
    "required": true,
    "label": "Arrival Time Utc"
   },
   {
    "name": "BaseFare",
    "type": "decimal",
    "kind": "number",
    "options": null,
    "required": true,
    "label": "Base Fare"
   },
   {
    "name": "Currency",
    "type": "string",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Currency"
   },
   {
    "name": "IsWheelchairAccessible",
    "type": "bool",
    "kind": "checkbox",
    "options": null,
    "required": true,
    "label": "Is Wheelchair Accessible"
   },
   {
    "name": "TripSeats",
    "type": "List<TripSeatCreateDto>",
    "kind": "text",
    "options": null,
    "required": true,
    "label": "Trip Seats"
   },
   {
    "name": "Status",
    "type": "TripStatus",
    "kind": "select",
    "options": [
     "Scheduled",
     "Boarding",
     "Departed",
     "Running",
     "Arrived",
     "Completed",
     "Delayed",
     "Cancelled"
    ],
    "required": true,
    "label": "Status"
   },
   {
    "name": "DelayReason",
    "type": "string?",
    "kind": "text",
    "options": null,
    "required": false,
    "label": "Delay Reason"
   }
  ],
  "workflowActions": [
   {
    "verb": "HttpPost",
    "path": "{id}/images",
    "label": "Images",
    "fields": [],
    "isCreate": false
   }
  ],
  "readOnly": false,
  "hasImageUpload": true
 }
};

export const NAV_GROUPS: { title: string; keys: string[] }[] = [
 {
  "title": "Users",
  "keys": [
   "CustomerProfiles",
   "StaffProfiles",
   "Agents"
  ]
 },
 {
  "title": "Bus Management",
  "keys": [
   "Buses",
   "BusCategories",
   "BusAmenities",
   "BusAmenityMappings",
   "BusImages",
   "BusMaintenanceLogs"
  ]
 },
 {
  "title": "Operators",
  "keys": [
   "BusOperators",
   "OperatorBranches",
   "OperatorContracts",
   "OperatorSettings",
   "OperatorIntegrations",
   "OperatorIntegrationEndpoints"
  ]
 },
 {
  "title": "Routes & Trips",
  "keys": [
   "BusRoutes",
   "RouteStops",
   "OperatorRouteStops",
   "Schedules",
   "Trips",
   "TripCrews",
   "TripStatusHistories",
   "FareRules",
   "Terminals"
  ]
 },
 {
  "title": "Bookings",
  "keys": [
   "Bookings",
   "Tickets",
   "SeatHolds",
   "SeatHoldItems",
   "CancellationRequests",
   "CancellationPolicies"
  ]
 },
 {
  "title": "Payments & Finance",
  "keys": [
   "Payments",
   "PaymentHistories",
   "PaymentWebhookEvents",
   "PaymentProviders",
   "PaymentMethodConfigurations",
   "Refunds",
   "RefundHistories",
   "PlatformLedgers",
   "CommissionRules",
   "TaxRules",
   "Currencies"
  ]
 },
 {
  "title": "Operator Finance",
  "keys": [
   "OperatorWallets",
   "OperatorPayouts",
   "OperatorSettlements",
   "OperatorSettlementItems",
   "OperatorStatements",
   "OperatorStatementItems",
   "OperatorInvoices",
   "OperatorPaymentReceipts"
  ]
 },
 {
  "title": "Marketing",
  "keys": [
   "Offers",
   "Coupons",
   "CouponUsages",
   "PromoBanners"
  ]
 },
 {
  "title": "Customers",
  "keys": [
   "CustomerAddresses",
   "EmergencyContacts",
   "DriverLicenses",
   "CustomerWalletTransactions",
   "Reviews",
   "Complaints"
  ]
 },
 {
  "title": "HR / Staff",
  "keys": [
   "StaffAttendances",
   "StaffSalaries"
  ]
 },
 {
  "title": "Sales",
  "keys": [
   "SalesCounters"
  ]
 },
 {
  "title": "Integrations",
  "keys": [
   "ExternalRouteMappings",
   "ExternalTripMappings",
   "ExternalSeatMappings",
   "ExternalBookingMappings",
   "IntegrationSyncLogs",
   "IntegrationWebhookLogs"
  ]
 },
 {
  "title": "System",
  "keys": [
   "Languages",
   "SystemSettings"
  ]
 },
 {
  "title": "Reports & Logs",
  "keys": [
   "ActivityLogs",
   "AuditLogs",
   "LoginHistories",
   "NotificationLogs"
  ]
 }
];

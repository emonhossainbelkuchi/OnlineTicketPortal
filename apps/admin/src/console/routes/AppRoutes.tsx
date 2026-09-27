import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Protected Route
import AdminLayout from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { HardRedirect } from '@/components/layout/HardRedirect';

// Auth Pages
import NotFound from '@/pages/NotFound';

// Admin Common Pages
import Dashboard from '@/pages/admin/Dashboard';
import GenericCrudPage from '@/pages/admin/GenericCrudPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';

// Bus Operators Pages
import BusOperatorsPage from '@/pages/admin/BusOperatorsPage';
import BusOperatorsCreatePage from '@/pages/admin/BusOperatorsCreatePage';
import BusOperatorsEdit from '@/pages/admin/BusOperatorsEdit';

// Bus Amenities Pages
import BusAmenitiesList from '@/pages/admin/BusAmenitiesList';
import BusAmenitiesCreate from '@/pages/admin/BusAmenitiesCreate';
import BusAmenitiesEdit from '@/pages/admin/BusAmenitiesEdit';

// Operator Branches Pages 
import OperatorBranchList from '@/pages/admin/OperatorBranchList';
import OperatorBranchCreate from '@/pages/admin/OperatorBranchCreate';
import OperatorBranchEdit from '@/pages/admin/OperatorBranchEdit';

// Buses (Fleet & Seat Layout) Pages 
import BusesList from '@/pages/admin/BusesList';
import BusesCreate from '@/pages/admin/BusesCreate';
import BusesEdit from '@/pages/admin/BusesEdit';

import BusCategoriesList from '@/pages/admin/BusCategoriesList';
import BusCategoriesCreate from '@/pages/admin/BusCategoriesCreate';
import BusCategoriesEdit from '@/pages/admin/BusCategoriesEdit';

// Customer Profiles Pages
import CustomerProfilesList from '@/pages/admin/CustomerProfilesList';
import CustomerProfilesCreate from '@/pages/admin/CustomerProfilesCreate';
import CustomerProfilesEdit from '@/pages/admin/CustomerProfilesEdit';
import CustomerProfilesDetails from '@/pages/admin/CustomerProfilesDetails';

// Bus Amenities Mapping Pages

// Bus Images Pages Imports

// Bookings Pages (realtime — shared api/Bookings backend with the public booking frontend)
import BookingsList from '@/pages/admin/BookingsList';
import BookingsCreate from '@/pages/admin/BookingsCreate';
import BookingsEdit from '@/pages/admin/BookingsEdit';
import BookingsDetails from '@/pages/admin/BookingsDetails';

// Bus Maintenance Logs Pages

// Operator Contracts Pages (Admin-only: settlement interval & gateway fee bearer feed settlement engine)

// Operator Settings Pages (Piece 1 Admin-only gate: platform parameters & merchant config)


// Operator Integrations Pages (Piece 6 Admin-only gate: external ERP API gateways & credentials)


// Operator Integration Endpoints Pages (Piece 6 Admin-only gate: route contracts & methods)


// Terminals Pages (realtime — same api/Terminals backend every dropdown across the app reads from)
import TerminalsList from '@/pages/admin/TerminalsList';
import TerminalsCreate from '@/pages/admin/TerminalsCreate';
import TerminalsEdit from '@/pages/admin/TerminalsEdit';
import TerminalsDetails from '@/pages/admin/TerminalsDetails';

// Schedules Pages (Piece 5 Operator Back-Office & Fleet Operations)
import ScheduleList from '@/pages/admin/ScheduleList';
import ScheduleCreate from '@/pages/admin/ScheduleCreate';
import ScheduleEdit from '@/pages/admin/ScheduleEdit';
import ScheduleDetails from '@/pages/admin/ScheduleDetails';


// Trips Pages
import TripsList from '@/pages/admin/TripsList';
import TripsCreate from '@/pages/admin/TripsCreate';
import TripsEdit from '@/pages/admin/TripsEdit';
import TripsDetails from '@/pages/admin/TripsDetails';

// Trip Crews Pages
import TripCrewsList from '@/pages/admin/TripCrewsList';
import TripCrewsCreate from '@/pages/admin/TripCrewsCreate';
import TripCrewsEdit from '@/pages/admin/TripCrewsEdit';
import TripCrewsDetails from '@/pages/admin/TripCrewsDetails';

// Payments Pages (realtime — api/Payments backend; Edit = Confirm/Fail action workflow)
import PaymentsList from '@/pages/admin/PaymentsList';
import PaymentsCreate from '@/pages/admin/PaymentsCreate';
import PaymentsEdit from '@/pages/admin/PaymentsEdit';
import PaymentsDetails from '@/pages/admin/PaymentsDetails';

// Trip Status Histories Pages (read-only audit trail)
import TripStatusHistoriesList from '@/pages/admin/TripStatusHistoriesList';
import TripStatusHistoriesDetails from '@/pages/admin/TripStatusHistoriesDetails';

// Fare Rules Pages
import FareRulesList from '@/pages/admin/FareRulesList';
import FareRulesCreate from '@/pages/admin/FareRulesCreate';
import FareRulesEdit from '@/pages/admin/FareRulesEdit';
import FareRulesDetails from '@/pages/admin/FareRulesDetails';

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
 import TicketsList from '@/pages/admin/TicketsList'; 
 import TicketsDetails from '@/pages/admin/TicketsDetails'; 

import SeatHoldItemsList from '@/pages/admin/SeatHoldItemsList';
import SeatHoldItemsDetails from '@/pages/admin/SeatHoldItemsDetails';

import SeatHoldsList from '@/pages/admin/SeatHoldsList';
import SeatHoldsDetails from '@/pages/admin/SeatHoldsDetails';

// Import (upore, onno import gulor sathe)
import CancellationRequestsList from '@/pages/admin/CancellationRequestsList';
import CancellationRequestsDetails from '@/pages/admin/CancellationRequestsDetails';

// Cancellation Policies Pages (realtime — api/CancellationPolicies backend)
import CancellationPoliciesList from '@/pages/admin/CancellationPoliciesList';
import CancellationPoliciesCreate from '@/pages/admin/CancellationPoliciesCreate';
import CancellationPoliciesEdit from '@/pages/admin/CancellationPoliciesEdit';
import CancellationPoliciesDetails from '@/pages/admin/CancellationPoliciesDetails';

// Payment Histories Pages (read-only audit trail — api/PaymentHistories, no Create/Edit)
import PaymentHistoriesList from '@/pages/admin/PaymentHistoriesList';
import PaymentHistoriesDetails from '@/pages/admin/PaymentHistoriesDetails';

// Payment Webhook Events Pages (read-only, Admin/Staff-only — api/PaymentWebhookEvents, no Create/Edit)
import PaymentWebhookEventsList from '@/pages/admin/PaymentWebhookEventsList';
import PaymentWebhookEventsDetails from '@/pages/admin/PaymentWebhookEventsDetails';

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import PaymentMethodConfigurationsList from '@/pages/admin/PaymentMethodConfigurationsList';
import PaymentMethodConfigurationDetails from '@/pages/admin/PaymentMethodConfigurationDetails';
import PaymentMethodConfigurationCreate from '@/pages/admin/PaymentMethodConfigurationCreate';
import PaymentMethodConfigurationEdit from '@/pages/admin/PaymentMethodConfigurationEdit';

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import RefundsList from '@/pages/admin/RefundsList';
import RefundDetails from '@/pages/admin/RefundDetails';

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import RefundHistoriesList from '@/pages/admin/RefundHistoriesList';
import RefundHistoryDetails from '@/pages/admin/RefundHistoryDetails';

import CommissionRulesList from "@/pages/admin/CommissionRulesList";
import CommissionRuleCreate from "@/pages/admin/CommissionRuleCreate";
import CommissionRuleEdit from "@/pages/admin/CommissionRuleEdit";
import CommissionRuleDetails from "@/pages/admin/CommissionRuleDetails";

// 1) Imports — add near your other admin imports (you already have 3 of these):
import TaxRuleList from "@/pages/admin/TaxRules/TaxRuleList";
import TaxRuleCreate from "@/pages/admin/TaxRules/TaxRuleCreate";
import TaxRuleEdit from "@/pages/admin/TaxRules/TaxRuleEdit";
import TaxRuleDetails from "@/pages/admin/TaxRules/TaxRuleDetails";

import CurrencyList from "@/pages/admin/Currencies/CurrencyList";
import CurrencyCreate from "@/pages/admin/Currencies/CurrencyCreate";
import CurrencyEdit from "@/pages/admin/Currencies/CurrencyEdit";
import CurrencyDetails from "@/pages/admin/Currencies/CurrencyDetails";

import OperatorWalletList from "@/pages/admin/OperatorWallets/OperatorWalletList";
import OperatorWalletDetails from "@/pages/admin/OperatorWallets/OperatorWalletDetails";

import OperatorPayoutList from "@/pages/admin/OperatorPayouts/OperatorPayoutList";
import OperatorPayoutCreate from "@/pages/admin/OperatorPayouts/OperatorPayoutCreate";
import OperatorPayoutDetails from "@/pages/admin/OperatorPayouts/OperatorPayoutDetails";

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import PlatformLedgersList from '@/pages/admin/PlatformLedgersList';
import PlatformLedgerDetails from '@/pages/admin/PlatformLedgerDetails';


import OperatorStatementList from "@/pages/admin/OperatorStatements/List";
import OperatorStatementDetails from "@/pages/admin/OperatorStatements/Details";

import OperatorSettlementsList from "@/pages/admin/OperatorSettlement/OperatorSettlementsList";
import OperatorSettlementCreate from "@/pages/admin/OperatorSettlement/OperatorSettlementCreate";
import OperatorSettlementEdit from "@/pages/admin/OperatorSettlement/OperatorSettlementEdit";
import OperatorSettlementDetails from "@/pages/admin/OperatorSettlement/OperatorSettlementDetails";


{/* Add these imports near the other page imports in AppRoutes.tsx.
    Note the path: pages live in a dedicated Offers/ subfolder, per request. */}
import OffersList from '@/pages/admin/Offers/OffersList';
import OffersDetails from '@/pages/admin/Offers/OffersDetails';
import OffersCreate from '@/pages/admin/Offers/OffersCreate';
import OffersEdit from '@/pages/admin/Offers/OffersEdit';

import OperatorInvoiceList from "@/pages/admin/OperatorInvoices/List";
import OperatorInvoiceDetails from "@/pages/admin/OperatorInvoices/Details";
import OperatorInvoiceCreate from "@/pages/admin/OperatorInvoices/Create";
import OperatorPaymentReceiptList from "@/pages/admin/OperatorPaymentReceipts/List";
import OperatorPaymentReceiptDetails from "@/pages/admin/OperatorPaymentReceipts/Details";
import OperatorPaymentReceiptCreate from "@/pages/admin/OperatorPaymentReceipts/Create";


// Operator Settlement Items Pages (real API — OperatorSettlementItemsController: read-only,
// written only by SettlementGenerationService; Create/Edit are informational stubs)
import OperatorSettlementItemList from '@/pages/admin/OperatorSettlementItem/OperatorSettlementItemList';
import OperatorSettlementItemCreate from '@/pages/admin/OperatorSettlementItem/OperatorSettlementItemCreate';
import OperatorSettlementItemEdit from '@/pages/admin/OperatorSettlementItem/OperatorSettlementItemEdit';
import OperatorSettlementItemDetails from '@/pages/admin/OperatorSettlementItem/OperatorSettlementItemDetails';

// Coupons Pages (real API — CouponsController: read for any authenticated user, Admin-only writes)
import CouponList from '@/pages/admin/Coupon/CouponList';
import CouponCreate from '@/pages/admin/Coupon/CouponCreate';
import CouponEdit from '@/pages/admin/Coupon/CouponEdit';
import CouponDetails from '@/pages/admin/Coupon/CouponDetails';

import CouponUsageList from "@/pages/admin/CouponUsages/List";
import CouponUsageDetails from "@/pages/admin/CouponUsages/Details";
import CouponUsageRedeem from "@/pages/admin/CouponUsages/Redeem";

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import PromoBannerList from '@/pages/admin/PromoBanner/PromoBannerList';
import PromoBannerDetails from '@/pages/admin/PromoBanner/PromoBannerDetails';
import PromoBannerCreate from '@/pages/admin/PromoBanner/PromoBannerCreate';
import PromoBannerEdit from '@/pages/admin/PromoBanner/PromoBannerEdit';


// Customer Addresses Pages (real API — CustomerAddressesController: owner-scoped for
// customers, all-visible for Admin/Staff/Operator; CustomerProfileId resolved server-side)
import CustomerAddressList from '@/pages/admin/CustomerAddress/CustomerAddressList';
import CustomerAddressCreate from '@/pages/admin/CustomerAddress/CustomerAddressCreate';
import CustomerAddressEdit from '@/pages/admin/CustomerAddress/CustomerAddressEdit';
import CustomerAddressDetails from '@/pages/admin/CustomerAddress/CustomerAddressDetails';

import EmergencyContactList from "@/pages/admin/EmergencyContacts/List";
import EmergencyContactDetails from "@/pages/admin/EmergencyContacts/Details";
import EmergencyContactCreate from "@/pages/admin/EmergencyContacts/Create";
import EmergencyContactEdit from "@/pages/admin/EmergencyContacts/Edit";

// Customer Wallet Transactions Pages (real API — CustomerWalletTransactionsController:
// read-only, written only by CustomerWalletService; Create/Edit are informational stubs)
import CustomerWalletTransactionList from '@/pages/admin/CustomerWalletTransaction/CustomerWalletTransactionList';
import CustomerWalletTransactionCreate from '@/pages/admin/CustomerWalletTransaction/CustomerWalletTransactionCreate';
import CustomerWalletTransactionEdit from '@/pages/admin/CustomerWalletTransaction/CustomerWalletTransactionEdit';
import CustomerWalletTransactionDetails from '@/pages/admin/CustomerWalletTransaction/CustomerWalletTransactionDetails';

import ReviewList from "@/pages/admin/Reviews/List";
import ReviewDetails from "@/pages/admin/Reviews/Details";
import ReviewCreate from "@/pages/admin/Reviews/Create";
import ReviewEdit from "@/pages/admin/Reviews/Edit";

// Complaints Pages (real API — ComplaintsController: owner-scoped for customers, all-visible
// for Admin/Staff/Operator; Status only moves through the staff-only status action)
import ComplaintList from '@/pages/admin/Complaint/ComplaintList';
import ComplaintCreate from '@/pages/admin/Complaint/ComplaintCreate';
import ComplaintEdit from '@/pages/admin/Complaint/ComplaintEdit';
import ComplaintDetails from '@/pages/admin/Complaint/ComplaintDetails';


import StaffAttendanceList from "@/pages/admin/StaffAttendances/List";
import StaffAttendanceDetails from "@/pages/admin/StaffAttendances/Details";
import StaffAttendanceCreate from "@/pages/admin/StaffAttendances/Create";
import StaffAttendanceEdit from "@/pages/admin/StaffAttendances/Edit";


import StaffSalaryList from "@/pages/admin/StaffSalaries/List";
import StaffSalaryDetails from "@/pages/admin/StaffSalaries/Details";
import StaffSalaryCreate from "@/pages/admin/StaffSalaries/Create";
import StaffSalaryEdit from "@/pages/admin/StaffSalaries/Edit";

import TripsDetailsNew from "@/pages/admin/Trips/TripsDetails";


{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import DriverLicenseList from '@/pages/admin/DriverLicense/DriverLicenseList';
import DriverLicenseDetails from '@/pages/admin/DriverLicense/DriverLicenseDetails';
import DriverLicenseCreate from '@/pages/admin/DriverLicense/DriverLicenseCreate';
import DriverLicenseEdit from '@/pages/admin/DriverLicense/DriverLicenseEdit';


import ExternalBookingMappingList from "@/pages/admin/ExternalBookingMappings/List";
import ExternalBookingMappingDetails from "@/pages/admin/ExternalBookingMappings/Details";
import ExternalBookingMappingCreate from "@/pages/admin/ExternalBookingMappings/Create";
import ExternalBookingMappingEdit from "@/pages/admin/ExternalBookingMappings/Edit";

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import IntegrationWebhookLogList from '@/pages/admin/IntegrationWebhookLog/IntegrationWebhookLogList';
import IntegrationWebhookLogDetails from '@/pages/admin/IntegrationWebhookLog/IntegrationWebhookLogDetails';

import SystemSettingList from "@/pages/admin/SystemSettings/List";
import SystemSettingDetails from "@/pages/admin/SystemSettings/Details";
import SystemSettingCreate from "@/pages/admin/SystemSettings/Create";
import SystemSettingEdit from "@/pages/admin/SystemSettings/Edit";

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import ActivityLogList from '@/pages/admin/ActivityLog/ActivityLogList';
import ActivityLogDetails from '@/pages/admin/ActivityLog/ActivityLogDetails';

import AuditLogList from "@/pages/admin/AuditLogs/List";
import AuditLogDetails from "@/pages/admin/AuditLogs/Details";

{/* Add these imports near the other page imports in AppRoutes.tsx: */}
import LoginHistoryList from '@/pages/admin/LoginHistory/LoginHistoryList';
import LoginHistoryDetails from '@/pages/admin/LoginHistory/LoginHistoryDetails';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<HardRedirect to='/' />} />

      {/* Auth Routes */}
      <Route path='/login' element={<HardRedirect to='/login' />} />
      

      {/* Admin / Staff / Operator Protected Routes */}
      <Route element={<ProtectedRoute roles={['Admin', 'Staff', 'Operator']} />}>
        <Route path='/admin' element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path='users' element={<AdminUsersPage />} />

          {/* Bus Operators */}
          <Route path='resource/BusOperators' element={<BusOperatorsPage />} />
          <Route path='bus-operators' element={<BusOperatorsPage />} />
          <Route path='bus-operators/create' element={<BusOperatorsCreatePage />} />
          <Route path='bus-operators/edit/:id' element={<BusOperatorsEdit />} />

          {/* Bus Amenities */}
          <Route path='resource/BusAmenities' element={<BusAmenitiesList />} />
          <Route path='bus-amenities' element={<BusAmenitiesList />} />
          <Route path='bus-amenities/create' element={<BusAmenitiesCreate />} />
          <Route path='bus-amenities/edit/:id' element={<BusAmenitiesEdit />} />

          {/* Operator Branches */}
          <Route path='resource/OperatorBranches' element={<OperatorBranchList />} />
          <Route path='operator-branches' element={<OperatorBranchList />} />
          <Route path='operator-branches/create' element={<OperatorBranchCreate />} />
          <Route path='operator-branches/edit/:id' element={<OperatorBranchEdit />} />

          {/* Dedicated Buses */}
          <Route path='resource/Buses' element={<BusesList />} />
          <Route path='buses' element={<BusesList />} />
          <Route path='buses/create' element={<BusesCreate />} />
          <Route path='buses/edit/:id' element={<BusesEdit />} />

          {/* Bus Categories */}
          <Route path='resource/BusCategories' element={<BusCategoriesList />} />
          <Route path='bus-categories' element={<BusCategoriesList />} />
          <Route path='bus-categories/create' element={<BusCategoriesCreate />} />
          <Route path='bus-categories/edit/:id' element={<BusCategoriesEdit />} />

          {/* Customer Profiles Routes */}
          <Route path='resource/CustomerProfiles' element={<CustomerProfilesList />} />
          <Route path='customer-profiles' element={<CustomerProfilesList />} />
          <Route path='customer-profiles/create' element={<CustomerProfilesCreate />} />
          <Route path='customer-profiles/edit/:id' element={<CustomerProfilesEdit />} />
          <Route path='customer-profiles/:id' element={<CustomerProfilesDetails />} />

          {/* Bus Amenities Mapping Routes */}

          {/* Bus Images Routes */}

          {/* Bookings (realtime — same api/Bookings backend as the public booking frontend) */}
          <Route path='resource/Bookings' element={<BookingsList />} />
          <Route path='resource/Booking' element={<BookingsList />} />
          <Route path='bookings' element={<BookingsList />} />
          <Route path='booking' element={<BookingsList />} />
          <Route path='bookings/create' element={<BookingsCreate />} />
          <Route path='bookings/new' element={<BookingsCreate />} />
          <Route path='booking/create' element={<BookingsCreate />} />
          <Route path='bookings/edit/:id' element={<BookingsEdit />} />
          <Route path='booking/edit/:id' element={<BookingsEdit />} />
          <Route path='bookings/:id' element={<BookingsDetails />} />
          <Route path='booking/:id' element={<BookingsDetails />} />
          <Route path='resource/Bookings/:id' element={<BookingsDetails />} />

          {/* Bus Maintenance Logs Routes */}

          {/* Operator Contracts Routes */}


          {/* Operator Settings Routes (Piece 1 Admin-only platform settings) */}

          {/* Operator Integrations Routes (Piece 6 Admin-only external ERP gateways) */}

          {/* Operator Integration Endpoints Routes (Piece 6 Admin-only gate: method & path contracts) */}

          {/* Terminals (realtime — same api/Terminals backend every dropdown across the app reads from) */}
          <Route path='resource/Terminals' element={<TerminalsList />} />
          <Route path='resource/Terminal' element={<TerminalsList />} />
          <Route path='terminals' element={<TerminalsList />} />
          <Route path='terminal' element={<TerminalsList />} />
          <Route path='terminals/create' element={<TerminalsCreate />} />
          <Route path='terminals/new' element={<TerminalsCreate />} />
          <Route path='terminal/create' element={<TerminalsCreate />} />
          <Route path='terminals/edit/:id' element={<TerminalsEdit />} />
          <Route path='terminal/edit/:id' element={<TerminalsEdit />} />
          <Route path='terminals/:id' element={<TerminalsDetails />} />
          <Route path='terminal/:id' element={<TerminalsDetails />} />
          <Route path='resource/Terminals/:id' element={<TerminalsDetails />} />

          {/* Bus Routes (Canonical platform routing) */}

          {/* Schedules Routes (Piece 5 Operator Back-Office & Fleet Operations) */}
          <Route path='resource/Schedules' element={<ScheduleList />} />
          <Route path='resource/Schedule' element={<ScheduleList />} />
          <Route path='schedules' element={<ScheduleList />} />
          <Route path='schedule' element={<ScheduleList />} />
          <Route path='schedules/create' element={<ScheduleCreate />} />
          <Route path='schedules/new' element={<ScheduleCreate />} />
          <Route path='schedule/create' element={<ScheduleCreate />} />
          <Route path='schedules/edit/:id' element={<ScheduleEdit />} />
          <Route path='schedule/edit/:id' element={<ScheduleEdit />} />
          <Route path='schedules/:id' element={<ScheduleDetails />} />
          <Route path='schedule/:id' element={<ScheduleDetails />} />
          <Route path='resource/Schedules/:id' element={<ScheduleDetails />} />

          {/* Trips */}
          <Route path='resource/Trips' element={<TripsList />} />
          <Route path='trips' element={<TripsList />} />
          <Route path='trips/create' element={<TripsCreate />} />
          <Route path='trips/new' element={<TripsCreate />} />
          <Route path='trips/edit/:id' element={<TripsEdit />} />
          <Route path='trips/:id' element={<TripsDetails />} />
          <Route path='resource/Trips/:id' element={<TripsDetails />} />

          {/* Trip Crews */}
          <Route path='resource/TripCrews' element={<TripCrewsList />} />
          <Route path='trip-crews' element={<TripCrewsList />} />
          <Route path='trip-crews/create' element={<TripCrewsCreate />} />
          <Route path='trip-crews/new' element={<TripCrewsCreate />} />
          <Route path='trip-crews/edit/:id' element={<TripCrewsEdit />} />
          <Route path='trip-crews/:id' element={<TripCrewsDetails />} />
          <Route path='resource/TripCrews/:id' element={<TripCrewsDetails />} />

          {/* Trip Status Histories (read-only) */}
          <Route path='resource/TripStatusHistories' element={<TripStatusHistoriesList />} />
          <Route path='trip-status-histories' element={<TripStatusHistoriesList />} />
          <Route path='trip-status-histories/:id' element={<TripStatusHistoriesDetails />} />
          <Route path='resource/TripStatusHistories/:id' element={<TripStatusHistoriesDetails />} />

          {/* Fare Rules */}
          <Route path='resource/FareRules' element={<FareRulesList />} />
          <Route path='fare-rules' element={<FareRulesList />} />
          <Route path='fare-rules/create' element={<FareRulesCreate />} />
          <Route path='fare-rules/new' element={<FareRulesCreate />} />
          <Route path='fare-rules/edit/:id' element={<FareRulesEdit />} />
          <Route path='fare-rules/:id' element={<FareRulesDetails />} />
          <Route path='resource/FareRules/:id' element={<FareRulesDetails />} />

          {/* Tickets Routes (read-only — backend has no Create/Edit for Ticket) */}
          <Route path='resource/Tickets' element={<TicketsList />} />
          <Route path='tickets' element={<TicketsList />} />
          <Route path='resource/Tickets/:id' element={<TicketsDetails />} />
          <Route path='tickets/:id' element={<TicketsDetails />} />

          {/* Seat Hold Items (read-only) */}
          <Route path='resource/SeatHoldItems' element={<SeatHoldItemsList />} />
          <Route path='seat-hold-items' element={<SeatHoldItemsList />} />
          <Route path='seat-hold-items/:id' element={<SeatHoldItemsDetails />} />

          {/* Seat Holds */}
          <Route path='resource/SeatHolds' element={<SeatHoldsList />} />
          <Route path='seat-holds' element={<SeatHoldsList />} />
          <Route path='seat-holds/:id' element={<SeatHoldsDetails />} />

          {/* Cancellation Requests */}
          <Route path='resource/CancellationRequests' element={<CancellationRequestsList />} />
          <Route path='cancellation-requests' element={<CancellationRequestsList />} />
          <Route path='cancellation-requests/:id' element={<CancellationRequestsDetails />} />
                  
          {/* Cancellation Policies (realtime — api/CancellationPolicies backend) */}
          <Route path='resource/CancellationPolicies' element={<CancellationPoliciesList />} />
          <Route path='resource/CancellationPolicy' element={<CancellationPoliciesList />} />
          <Route path='cancellation-policies' element={<CancellationPoliciesList />} />
          <Route path='cancellation-policy' element={<CancellationPoliciesList />} />
          <Route path='cancellation-policies/create' element={<CancellationPoliciesCreate />} />
          <Route path='cancellation-policies/new' element={<CancellationPoliciesCreate />} />
          <Route path='cancellation-policy/create' element={<CancellationPoliciesCreate />} />
          <Route path='cancellation-policies/edit/:id' element={<CancellationPoliciesEdit />} />
          <Route path='cancellation-policy/edit/:id' element={<CancellationPoliciesEdit />} />
          <Route path='cancellation-policies/:id' element={<CancellationPoliciesDetails />} />
          <Route path='cancellation-policy/:id' element={<CancellationPoliciesDetails />} />
          <Route path='resource/CancellationPolicies/:id' element={<CancellationPoliciesDetails />} />

          {/* Payments (realtime — api/Payments backend; Edit = Confirm/Fail workflow, no raw PUT exists) */}
          <Route path='resource/Payments' element={<PaymentsList />} />
          <Route path='resource/Payment' element={<PaymentsList />} />
          <Route path='payments' element={<PaymentsList />} />
          <Route path='payment' element={<PaymentsList />} />
          <Route path='payments/create' element={<PaymentsCreate />} />
          <Route path='payments/new' element={<PaymentsCreate />} />
          <Route path='payment/create' element={<PaymentsCreate />} />
          <Route path='payments/edit/:id' element={<PaymentsEdit />} />
          <Route path='payment/edit/:id' element={<PaymentsEdit />} />
          <Route path='payments/:id' element={<PaymentsDetails />} />
          <Route path='payment/:id' element={<PaymentsDetails />} />
          <Route path='resource/Payments/:id' element={<PaymentsDetails />} />

          {/* Payment Histories (read-only audit trail — api/PaymentHistories, no Create/Edit) */}
          <Route path='resource/PaymentHistories' element={<PaymentHistoriesList />} />
          <Route path='resource/PaymentHistory' element={<PaymentHistoriesList />} />
          <Route path='payment-histories' element={<PaymentHistoriesList />} />
          <Route path='payment-history' element={<PaymentHistoriesList />} />
          <Route path='payment-histories/:id' element={<PaymentHistoriesDetails />} />
          <Route path='payment-history/:id' element={<PaymentHistoriesDetails />} />
          <Route path='resource/PaymentHistories/:id' element={<PaymentHistoriesDetails />} />

          {/* Payment Webhook Events (read-only, Admin/Staff-only — api/PaymentWebhookEvents, no Create/Edit) */}
          <Route path='resource/PaymentWebhookEvents' element={<PaymentWebhookEventsList />} />
          <Route path='resource/PaymentWebhookEvent' element={<PaymentWebhookEventsList />} />
          <Route path='payment-webhook-events' element={<PaymentWebhookEventsList />} />
          <Route path='payment-webhook-event' element={<PaymentWebhookEventsList />} />
          <Route path='payment-webhook-events/:id' element={<PaymentWebhookEventsDetails />} />
          <Route path='payment-webhook-event/:id' element={<PaymentWebhookEventsDetails />} />
          <Route path='resource/PaymentWebhookEvents/:id' element={<PaymentWebhookEventsDetails />} />


          {/* Payment Method Configurations (Admin-only — controller returns Forbid/empty for anyone else) */}
          <Route path='resource/PaymentMethodConfigurations' element={<PaymentMethodConfigurationsList />} />
          <Route path='payment-method-configurations' element={<PaymentMethodConfigurationsList />} />
          <Route path='resource/PaymentMethodConfigurations/:id' element={<PaymentMethodConfigurationDetails />} />
          <Route path='payment-method-configurations/:id' element={<PaymentMethodConfigurationDetails />} />
          <Route path='payment-method-configurations/create' element={<PaymentMethodConfigurationCreate />} />
          <Route path='payment-method-configurations/new' element={<PaymentMethodConfigurationCreate />} />
          <Route path='payment-method-configurations/edit/:id' element={<PaymentMethodConfigurationEdit />} />

            {/* Add these routes inside the <Route path='/admin' element={<AdminLayout />}> block: */}

            {/* Refunds — no Create/Edit (see RefundsController: refunds are only ever created
                automatically, and only move via Approve/Reject/Process/CompleteManualPayout,
                all handled as actions on RefundDetails). */}
            <Route path='resource/Refunds' element={<RefundsList />} />
            <Route path='refunds' element={<RefundsList />} />
            <Route path='resource/Refunds/:id' element={<RefundDetails />} />
            <Route path='refunds/:id' element={<RefundDetails />} />

          {/* Add these routes inside the <Route path='/admin' element={<AdminLayout />}> block: */}

          {/* Refund Histories (read-only audit trail — api/RefundHistories, no Create/Edit) */}
          <Route path='resource/RefundHistories' element={<RefundHistoriesList />} />
          <Route path='refund-histories' element={<RefundHistoriesList />} />
          <Route path='resource/RefundHistories/:id' element={<RefundHistoryDetails />} />
          <Route path='refund-histories/:id' element={<RefundHistoryDetails />} />


          <Route path='resource/CommissionRules' element={<CommissionRulesList />} />
          <Route path='commission-rules' element={<CommissionRulesList />} />
          <Route path='resource/CommissionRules/create' element={<CommissionRuleCreate />} />
          <Route path='commission-rules/create' element={<CommissionRuleCreate />} />
          <Route path='resource/CommissionRules/:id/edit' element={<CommissionRuleEdit />} />
          <Route path='commission-rules/:id/edit' element={<CommissionRuleEdit />} />
          <Route path='resource/CommissionRules/:id' element={<CommissionRuleDetails />} />
          <Route path='commission-rules/:id' element={<CommissionRuleDetails />} />

          <Route path="resource/TaxRules" element={<TaxRuleList />} />
          <Route path="resource/TaxRules/create" element={<TaxRuleCreate />} />
          <Route path="resource/TaxRules/:id/edit" element={<TaxRuleEdit />} />
          <Route path="resource/TaxRules/:id" element={<TaxRuleDetails />} />

          <Route path="resource/Currencies" element={<CurrencyList />} />
          <Route path="resource/Currencies/create" element={<CurrencyCreate />} />
          <Route path="resource/Currencies/:id/edit" element={<CurrencyEdit />} />
          <Route path="resource/Currencies/:id" element={<CurrencyDetails />} />

          <Route path="resource/OperatorWallets" element={<OperatorWalletList />} />
          <Route path="resource/OperatorWallets/:id" element={<OperatorWalletDetails />} />

          
          <Route path="resource/OperatorPayouts" element={<OperatorPayoutList />} />
          <Route path="resource/OperatorPayouts/create" element={<OperatorPayoutCreate />} />
          <Route path="resource/OperatorPayouts/:id" element={<OperatorPayoutDetails />} />

          {/* Add these routes inside the <Route path='/admin' element={<AdminLayout />}> block: */}

          {/* Platform Ledgers (read-only, append-only money diary — api/PlatformLedgers,
              FinanceLedgerService is the only writer, no Create/Edit) */}
          <Route path='resource/PlatformLedgers' element={<PlatformLedgersList />} />
          <Route path='platform-ledgers' element={<PlatformLedgersList />} />
          <Route path='resource/PlatformLedgers/:id' element={<PlatformLedgerDetails />} />
          <Route path='platform-ledgers/:id' element={<PlatformLedgerDetails />} />


          {/* Operator Statements (read-only — generated alongside OperatorSettlement by
              SettlementGenerationService, see OperatorStatementsController class comment, no Create/Edit) */}
          <Route path='resource/OperatorStatements' element={<OperatorStatementList />} />
          <Route path='operator-statements' element={<OperatorStatementList />} />
          <Route path='resource/OperatorStatements/:id' element={<OperatorStatementDetails />} />
          <Route path='operator-statements/:id' element={<OperatorStatementDetails />} />

          <Route path='resource/OperatorSettlement' element={<OperatorSettlementsList />} />
          <Route path='resource/OperatorSettlement/create' element={<OperatorSettlementCreate />} />
          <Route path='resource/OperatorSettlement/:id/edit' element={<OperatorSettlementEdit />} />
          <Route path='resource/OperatorSettlement/:id' element={<OperatorSettlementDetails />} />

          {/* Add these routes inside the <Route path='/admin' element={<AdminLayout />}> block: */}

          {/* Offers (read open to everyone, Create/Update/Delete Admin-only — api/Offers) */}
          <Route path='resource/Offers' element={<OffersList />} />
          <Route path='offers' element={<OffersList />} />
          <Route path='resource/Offers/:id' element={<OffersDetails />} />
          <Route path='offers/:id' element={<OffersDetails />} />
          <Route path='offers/create' element={<OffersCreate />} />
          <Route path='offers/new' element={<OffersCreate />} />
          <Route path='offers/edit/:id' element={<OffersEdit />} />

          {/* Operator Invoices — POST + Issue/Cancel actions exist, no generic PUT/DELETE
              (see OperatorInvoicesController class comment) */}
          <Route path='resource/OperatorInvoices' element={<OperatorInvoiceList />} />
          <Route path='operator-invoices' element={<OperatorInvoiceList />} />
          <Route path='resource/OperatorInvoices/create' element={<OperatorInvoiceCreate />} />
          <Route path='resource/OperatorInvoices/:id' element={<OperatorInvoiceDetails />} />
          <Route path='operator-invoices/:id' element={<OperatorInvoiceDetails />} />

          {/* Operator Payment Receipts — Create only (assumed, controller not seen), no update/delete.
              A receipt is a financial record recorded via InvoicePaymentService.RecordReceiptAsync. */}
          <Route path='resource/OperatorPaymentReceipts' element={<OperatorPaymentReceiptList />} />
          <Route path='operator-payment-receipts' element={<OperatorPaymentReceiptList />} />
          <Route path='resource/OperatorPaymentReceipts/create' element={<OperatorPaymentReceiptCreate />} />
          <Route path='resource/OperatorPaymentReceipts/:id' element={<OperatorPaymentReceiptDetails />} />
          <Route path='operator-payment-receipts/:id' element={<OperatorPaymentReceiptDetails />} />

          {/* Operator Settlement Items (real API — read-only ledger; Create/Edit are explainer stubs) */}
          <Route path='resource/OperatorSettlementItems' element={<OperatorSettlementItemList />} />
          <Route path='resource/OperatorSettlementItem' element={<OperatorSettlementItemList />} />
          <Route path='operator-settlement-items' element={<OperatorSettlementItemList />} />
          <Route path='operator-settlement-item' element={<OperatorSettlementItemList />} />
          <Route path='operator-settlement-items/create' element={<OperatorSettlementItemCreate />} />
          <Route path='operator-settlement-item/create' element={<OperatorSettlementItemCreate />} />
          <Route path='operator-settlement-items/edit/:id' element={<OperatorSettlementItemEdit />} />
          <Route path='operator-settlement-item/edit/:id' element={<OperatorSettlementItemEdit />} />
          <Route path='operator-settlement-items/:id' element={<OperatorSettlementItemDetails />} />
          <Route path='operator-settlement-item/:id' element={<OperatorSettlementItemDetails />} />
          <Route path='resource/OperatorSettlementItems/:id' element={<OperatorSettlementItemDetails />} />

          {/* Coupons (real API — read for any authenticated user, Admin-only writes) */}
          <Route path='resource/Coupons' element={<CouponList />} />
          <Route path='resource/Coupon' element={<CouponList />} />
          <Route path='coupons' element={<CouponList />} />
          <Route path='coupon' element={<CouponList />} />
          <Route path='coupons/create' element={<CouponCreate />} />
          <Route path='coupons/new' element={<CouponCreate />} />
          <Route path='coupon/create' element={<CouponCreate />} />
          <Route path='coupons/edit/:id' element={<CouponEdit />} />
          <Route path='coupon/edit/:id' element={<CouponEdit />} />
          <Route path='coupons/:id' element={<CouponDetails />} />
          <Route path='coupon/:id' element={<CouponDetails />} />
          <Route path='resource/Coupons/:id' element={<CouponDetails />} />


          {/* Coupon Usages — Redeem only (POST /redeem), no generic Create/Update/Delete
              (see CouponUsagesController class comment) */}
          <Route path='resource/CouponUsages' element={<CouponUsageList />} />
          <Route path='coupon-usages' element={<CouponUsageList />} />
          <Route path='resource/CouponUsages/redeem' element={<CouponUsageRedeem />} />
          <Route path='resource/CouponUsages/:id' element={<CouponUsageDetails />} />
          <Route path='coupon-usages/:id' element={<CouponUsageDetails />} />

          {/* Add these routes inside the <Route path='/admin' element={<AdminLayout />}> block: */}

          {/* Promo Banners (read open to everyone signed in, Create/Update/Delete Admin-only — api/PromoBanners) */}
          <Route path='resource/PromoBanners' element={<PromoBannerList />} />
          <Route path='promo-banners' element={<PromoBannerList />} />
          <Route path='resource/PromoBanners/:id' element={<PromoBannerDetails />} />
          <Route path='promo-banners/:id' element={<PromoBannerDetails />} />
          <Route path='promo-banners/create' element={<PromoBannerCreate />} />
          <Route path='promo-banners/new' element={<PromoBannerCreate />} />
          <Route path='promo-banners/edit/:id' element={<PromoBannerEdit />} />

          {/* Customer Addresses (real API — owner-scoped for customers, all-visible for staff) */}
          <Route path='resource/CustomerAddresses' element={<CustomerAddressList />} />
          <Route path='resource/CustomerAddress' element={<CustomerAddressList />} />
          <Route path='customer-addresses' element={<CustomerAddressList />} />
          <Route path='customer-address' element={<CustomerAddressList />} />
          <Route path='customer-addresses/create' element={<CustomerAddressCreate />} />
          <Route path='customer-addresses/new' element={<CustomerAddressCreate />} />
          <Route path='customer-address/create' element={<CustomerAddressCreate />} />
          <Route path='customer-addresses/edit/:id' element={<CustomerAddressEdit />} />
          <Route path='customer-address/edit/:id' element={<CustomerAddressEdit />} />
          <Route path='customer-addresses/:id' element={<CustomerAddressDetails />} />
          <Route path='customer-address/:id' element={<CustomerAddressDetails />} />
          <Route path='resource/CustomerAddresses/:id' element={<CustomerAddressDetails />} />

        {/* Emergency Contacts — full CRUD, ownership-scoped, soft delete
            (see EmergencyContactsController) */}
        <Route path='resource/EmergencyContacts' element={<EmergencyContactList />} />
        <Route path='emergency-contacts' element={<EmergencyContactList />} />
        <Route path='resource/EmergencyContacts/create' element={<EmergencyContactCreate />} />
        <Route path='resource/EmergencyContacts/:id/edit' element={<EmergencyContactEdit />} />
        <Route path='resource/EmergencyContacts/:id' element={<EmergencyContactDetails />} />
        <Route path='emergency-contacts/:id' element={<EmergencyContactDetails />} />

          {/* Customer Wallet Transactions (real API — read-only ledger; Create/Edit are explainer stubs) */}
          <Route path='resource/CustomerWalletTransactions' element={<CustomerWalletTransactionList />} />
          <Route path='resource/CustomerWalletTransaction' element={<CustomerWalletTransactionList />} />
          <Route path='customer-wallet-transactions' element={<CustomerWalletTransactionList />} />
          <Route path='customer-wallet-transaction' element={<CustomerWalletTransactionList />} />
          <Route path='customer-wallet-transactions/create' element={<CustomerWalletTransactionCreate />} />
          <Route path='customer-wallet-transaction/create' element={<CustomerWalletTransactionCreate />} />
          <Route path='customer-wallet-transactions/edit/:id' element={<CustomerWalletTransactionEdit />} />
          <Route path='customer-wallet-transaction/edit/:id' element={<CustomerWalletTransactionEdit />} />
          <Route path='customer-wallet-transactions/:id' element={<CustomerWalletTransactionDetails />} />
          <Route path='customer-wallet-transaction/:id' element={<CustomerWalletTransactionDetails />} />
          <Route path='resource/CustomerWalletTransactions/:id' element={<CustomerWalletTransactionDetails />} />

          {/* Reviews — GetAll/GetById unscoped, writes require own booking + own/staff access
              (see ReviewsController). Soft delete. */}
          <Route path='resource/Reviews' element={<ReviewList />} />
          <Route path='reviews' element={<ReviewList />} />
          <Route path='resource/Reviews/create' element={<ReviewCreate />} />
          <Route path='resource/Reviews/:id/edit' element={<ReviewEdit />} />
          <Route path='resource/Reviews/:id' element={<ReviewDetails />} />
          <Route path='reviews/:id' element={<ReviewDetails />} />

                    {/* Complaints (real API — owner-scoped for customers, all-visible + status action for staff) */}
          <Route path='resource/Complaints' element={<ComplaintList />} />
          <Route path='resource/Complaint' element={<ComplaintList />} />
          <Route path='complaints' element={<ComplaintList />} />
          <Route path='complaint' element={<ComplaintList />} />
          <Route path='complaints/create' element={<ComplaintCreate />} />
          <Route path='complaints/new' element={<ComplaintCreate />} />
          <Route path='complaint/create' element={<ComplaintCreate />} />
          <Route path='complaints/edit/:id' element={<ComplaintEdit />} />
          <Route path='complaint/edit/:id' element={<ComplaintEdit />} />
          <Route path='complaints/:id' element={<ComplaintDetails />} />
          <Route path='complaint/:id' element={<ComplaintDetails />} />
          <Route path='resource/Complaints/:id' element={<ComplaintDetails />} />


                    {/* Staff Attendances — full CRUD, operator-scoped, soft delete
              (see StaffAttendancesController) */}
          <Route path='resource/StaffAttendances' element={<StaffAttendanceList />} />
          <Route path='staff-attendances' element={<StaffAttendanceList />} />
          <Route path='resource/StaffAttendances/create' element={<StaffAttendanceCreate />} />
          <Route path='resource/StaffAttendances/:id/edit' element={<StaffAttendanceEdit />} />
          <Route path='resource/StaffAttendances/:id' element={<StaffAttendanceDetails />} />
          <Route path='staff-attendances/:id' element={<StaffAttendanceDetails />} />


          {/* Staff Salaries — full CRUD, operator-scoped, soft delete
              (see StaffSalariesController). Compensation data — customers blocked entirely. */}
          <Route path='resource/StaffSalaries' element={<StaffSalaryList />} />
          <Route path='staff-salaries' element={<StaffSalaryList />} />
          <Route path='resource/StaffSalaries/create' element={<StaffSalaryCreate />} />
          <Route path='resource/StaffSalaries/:id/edit' element={<StaffSalaryEdit />} />
          <Route path='resource/StaffSalaries/:id' element={<StaffSalaryDetails />} />
          <Route path='staff-salaries/:id' element={<StaffSalaryDetails />} />

          <Route path='resource/Trips' element={<TripsList />} />
          <Route path='resource/Trips/create' element={<TripsCreate />} />
          <Route path='resource/Trips/:id/edit' element={<TripsEdit />} />
          <Route path='resource/Trips/:id' element={<TripsDetails />} />
                    


          {/* Driver Licenses (operator-scoped — api/DriverLicenses. Customers get an empty list;
              an operator's own Staff/Operator see only their own drivers' licenses; Admin/platform-Staff
              see everything. StaffProfileId is fixed at Create — never reassignable via Update.) */}
          <Route path='resource/DriverLicenses' element={<DriverLicenseList />} />
          <Route path='driver-licenses' element={<DriverLicenseList />} />
          <Route path='resource/DriverLicenses/:id' element={<DriverLicenseDetails />} />
          <Route path='driver-licenses/:id' element={<DriverLicenseDetails />} />
          <Route path='driver-licenses/create' element={<DriverLicenseCreate />} />
          <Route path='driver-licenses/new' element={<DriverLicenseCreate />} />
          <Route path='driver-licenses/edit/:id' element={<DriverLicenseEdit />} />

          {/* External Booking Mappings — reads: platform Staff/Admin only (StaffProfile.BusOperatorId
              null). writes: Admin-only. Internal sync bookkeeping (see controller header). */}
          <Route path='resource/ExternalBookingMappings' element={<ExternalBookingMappingList />} />
          <Route path='external-booking-mappings' element={<ExternalBookingMappingList />} />
          <Route path='resource/ExternalBookingMappings/create' element={<ExternalBookingMappingCreate />} />
          <Route path='resource/ExternalBookingMappings/:id/edit' element={<ExternalBookingMappingEdit />} />
          <Route path='resource/ExternalBookingMappings/:id' element={<ExternalBookingMappingDetails />} />
          <Route path='external-booking-mappings/:id' element={<ExternalBookingMappingDetails />} />

            {/* Integration Webhook Logs (read-only, platform Admin/Staff only — api/IntegrationWebhookLogs.
                GetAll returns [] rather than 403 for anyone else, so the page itself gates on role too. No
                Create/Edit: written only by the future ERP sync worker, not built yet.) */}
            <Route path='resource/IntegrationWebhookLogs' element={<IntegrationWebhookLogList />} />
            <Route path='integration-webhook-logs' element={<IntegrationWebhookLogList />} />
            <Route path='resource/IntegrationWebhookLogs/:id' element={<IntegrationWebhookLogDetails />} />
            <Route path='integration-webhook-logs/:id' element={<IntegrationWebhookLogDetails />} />


            {/* System Settings — full CRUD, Admin-only end to end (reads included), soft delete.
                Free-form platform-wide config (see SystemSettingsController header). */}
            <Route path='resource/SystemSettings' element={<SystemSettingList />} />
            <Route path='system-settings' element={<SystemSettingList />} />
            <Route path='resource/SystemSettings/create' element={<SystemSettingCreate />} />
            <Route path='resource/SystemSettings/:id/edit' element={<SystemSettingEdit />} />
            <Route path='resource/SystemSettings/:id' element={<SystemSettingDetails />} />
            <Route path='system-settings/:id' element={<SystemSettingDetails />} />

                {/* Activity Logs (read-only, Admin/Staff only — api/ActivityLogs. GetAll returns [] rather
                    than 403 for anyone else, so the page itself gates on role too. No Create/Edit: a trail
                    table is never client-writable, and nothing writes here yet either — flagged as follow-up
                    work in the controller comment.) */}
                <Route path='resource/ActivityLogs' element={<ActivityLogList />} />
                <Route path='activity-logs' element={<ActivityLogList />} />
                <Route path='resource/ActivityLogs/:id' element={<ActivityLogDetails />} />
                <Route path='activity-logs/:id' element={<ActivityLogDetails />} />

                {/* Audit Logs — read-only, Admin/Staff only, no POST/PUT/DELETE
                    (see AuditLogsController class comment). Compliance trail, nothing writes here yet. */}
                <Route path='resource/AuditLogs' element={<AuditLogList />} />
                <Route path='audit-logs' element={<AuditLogList />} />
                <Route path='resource/AuditLogs/:id' element={<AuditLogDetails />} />
                <Route path='audit-logs/:id' element={<AuditLogDetails />} />


                {/* Add these routes inside the <Route path='/admin' element={<AdminLayout />}> block.
                    Unlike ActivityLogs/IntegrationWebhookLogs, this one is NOT Admin/Staff-only — any
                    authenticated user can see their OWN login history (server-side scoped), so this can also
                    be exposed outside /admin if there's a "My Account / Security" area for plain customers. */}
                <Route path='resource/LoginHistories' element={<LoginHistoryList />} />
                <Route path='login-histories' element={<LoginHistoryList />} />
                <Route path='resource/LoginHistories/:id' element={<LoginHistoryDetails />} />
                <Route path='login-histories/:id' element={<LoginHistoryDetails />} />



          {/* Fallback */}
          {/* Families whose original pages were localStorage-only prototypes now use the generic,
              API-backed resource page (see console/README.md). Old URLs redirect there. (Never use a
              `resource/<Key>/*` splat here: it also matches the bare list URL and redirects it to itself.) */}
          <Route path='bus-amenity-mappings/*' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='bus-amenity-mappings' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='bus-amenities-mapping/*' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='bus-amenities-mapping' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='bus-amenities-mappings/*' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='bus-amenities-mappings' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='resource/BusAmenityMappings/:id' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='resource/BusAmenityMappings/:id/edit' element={<Navigate to='/admin/resource/BusAmenityMappings' replace />} />
          <Route path='bus-images/*' element={<Navigate to='/admin/resource/BusImages' replace />} />
          <Route path='bus-images' element={<Navigate to='/admin/resource/BusImages' replace />} />
          <Route path='bus-image/*' element={<Navigate to='/admin/resource/BusImages' replace />} />
          <Route path='bus-image' element={<Navigate to='/admin/resource/BusImages' replace />} />
          <Route path='resource/BusImages/:id' element={<Navigate to='/admin/resource/BusImages' replace />} />
          <Route path='resource/BusImages/:id/edit' element={<Navigate to='/admin/resource/BusImages' replace />} />
          <Route path='bus-maintenance-logs/*' element={<Navigate to='/admin/resource/BusMaintenanceLogs' replace />} />
          <Route path='bus-maintenance-logs' element={<Navigate to='/admin/resource/BusMaintenanceLogs' replace />} />
          <Route path='bus-maintenance-log/*' element={<Navigate to='/admin/resource/BusMaintenanceLogs' replace />} />
          <Route path='bus-maintenance-log' element={<Navigate to='/admin/resource/BusMaintenanceLogs' replace />} />
          <Route path='resource/BusMaintenanceLogs/:id' element={<Navigate to='/admin/resource/BusMaintenanceLogs' replace />} />
          <Route path='resource/BusMaintenanceLogs/:id/edit' element={<Navigate to='/admin/resource/BusMaintenanceLogs' replace />} />
          <Route path='bus-routes/*' element={<Navigate to='/admin/resource/BusRoutes' replace />} />
          <Route path='bus-routes' element={<Navigate to='/admin/resource/BusRoutes' replace />} />
          <Route path='bus-route/*' element={<Navigate to='/admin/resource/BusRoutes' replace />} />
          <Route path='bus-route' element={<Navigate to='/admin/resource/BusRoutes' replace />} />
          <Route path='resource/BusRoutes/:id' element={<Navigate to='/admin/resource/BusRoutes' replace />} />
          <Route path='resource/BusRoutes/:id/edit' element={<Navigate to='/admin/resource/BusRoutes' replace />} />
          <Route path='operator-contracts/*' element={<Navigate to='/admin/resource/OperatorContracts' replace />} />
          <Route path='operator-contracts' element={<Navigate to='/admin/resource/OperatorContracts' replace />} />
          <Route path='resource/OperatorContracts/:id' element={<Navigate to='/admin/resource/OperatorContracts' replace />} />
          <Route path='resource/OperatorContracts/:id/edit' element={<Navigate to='/admin/resource/OperatorContracts' replace />} />
          <Route path='operator-integrations/*' element={<Navigate to='/admin/resource/OperatorIntegrations' replace />} />
          <Route path='operator-integrations' element={<Navigate to='/admin/resource/OperatorIntegrations' replace />} />
          <Route path='operator-integration/*' element={<Navigate to='/admin/resource/OperatorIntegrations' replace />} />
          <Route path='operator-integration' element={<Navigate to='/admin/resource/OperatorIntegrations' replace />} />
          <Route path='resource/OperatorIntegrations/:id' element={<Navigate to='/admin/resource/OperatorIntegrations' replace />} />
          <Route path='resource/OperatorIntegrations/:id/edit' element={<Navigate to='/admin/resource/OperatorIntegrations' replace />} />
          <Route path='operator-integration-endpoints/*' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-integration-endpoints' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-integration-endpoint/*' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-integration-endpoint' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-setting-endpoints/*' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-setting-endpoints' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-setting-endpoint/*' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-setting-endpoint' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='resource/OperatorIntegrationEndpoints/:id' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='resource/OperatorIntegrationEndpoints/:id/edit' element={<Navigate to='/admin/resource/OperatorIntegrationEndpoints' replace />} />
          <Route path='operator-settings/*' element={<Navigate to='/admin/resource/OperatorSettings' replace />} />
          <Route path='operator-settings' element={<Navigate to='/admin/resource/OperatorSettings' replace />} />
          <Route path='operator-setting/*' element={<Navigate to='/admin/resource/OperatorSettings' replace />} />
          <Route path='operator-setting' element={<Navigate to='/admin/resource/OperatorSettings' replace />} />
          <Route path='resource/OperatorSettings/:id' element={<Navigate to='/admin/resource/OperatorSettings' replace />} />
          <Route path='resource/OperatorSettings/:id/edit' element={<Navigate to='/admin/resource/OperatorSettings' replace />} />
          <Route path='external-trip-mappings/*' element={<Navigate to='/admin/resource/ExternalTripMappings' replace />} />
          <Route path='external-trip-mappings' element={<Navigate to='/admin/resource/ExternalTripMappings' replace />} />
          <Route path='resource/ExternalTripMappings/:id' element={<Navigate to='/admin/resource/ExternalTripMappings' replace />} />
          <Route path='resource/ExternalTripMappings/:id/edit' element={<Navigate to='/admin/resource/ExternalTripMappings' replace />} />
          <Route path='resource/:resourceKey' element={<GenericCrudPage />} />
          {/* An unknown /admin/... URL used to leave the content area silently empty. */}
          <Route path='*' element={<NotFound />} />
        </Route>
      </Route>

      {/* 404 Catch-All */}
      <Route path='*' element={<NotFound />} />
    </Routes>
  );
}
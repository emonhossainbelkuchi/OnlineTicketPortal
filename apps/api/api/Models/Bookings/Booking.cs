using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.CompanyNetwork;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Marketing;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.People;
using TicketPortal.Api.Models.Scheduling;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.Models.Bookings
{
    // The main record of a customer buying seats — this is what a PNR/booking reference
    // actually points to. One Booking can cover several seats/passengers on the same trip
    // (see BookingPassenger and Tickets below).
    //
    // Two fields do a lot of quiet work here:
    //   - MoneyCollectedBy says who is physically holding the cash right now (us, if paid
    //     online, or the operator, if paid at their counter) — this is what the whole
    //     commission/settlement side of the system keys off.
    //   - BoardingTerminal/DroppingTerminal are THIS passenger's actual board/alight points,
    //     which can be an intermediate stop, not necessarily the trip's overall start/end.
    public class Booking : AuditableEntity
    {
        public Guid BusOperatorId { get; set; }
        public Guid TripId { get; set; }
        public Guid? SeatHoldId { get; set; } // The hold this booking was converted from.
        public Guid? CustomerProfileId { get; set; } // Null for a guest checkout.
        public Guid? SalesCounterId { get; set; } // Set if this was sold at a physical counter.
        public Guid? AgentId { get; set; } // Set if sold through a travel agent.
        public Guid BoardingTerminalId { get; set; }
        public Guid DroppingTerminalId { get; set; }
        public Guid? CouponId { get; set; }

        [MaxLength(20)]
        public string Pnr { get; set; } = string.Empty; // The reference number the customer actually uses.

        [MaxLength(120)]
        public string ContactName { get; set; } = string.Empty;

        [MaxLength(30)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(120)]
        public string? ContactEmail { get; set; }

        public BookingSource Source { get; set; } = BookingSource.Web; // Where it was made (web, app, counter...).
        public SaleChannel SaleChannel { get; set; } = SaleChannel.Online; // Which finance channel it belongs to.

        // Platform = customer paid us online (we owe the operator later).
        // Operator = customer paid cash at the operator's own counter (they owe us commission later).
        public MoneyCollectedBy MoneyCollectedBy { get; set; } = MoneyCollectedBy.Platform;

        public BookingStatus Status { get; set; } = BookingStatus.PendingPayment;

        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal ServiceChargeAmount { get; set; }
        public decimal GrandTotal { get; set; } // The final amount actually charged.

        [MaxLength(3)]
        public string Currency { get; set; } = "BDT";

        public DateTime? ExpiresAtUtc { get; set; } // Payment deadline, mirrors the linked SeatHold's timer.
        public DateTime? ConfirmedAtUtc { get; set; }
        public DateTime? CompletedAtUtc { get; set; }
        public DateTime? CancelledAtUtc { get; set; }

        [MaxLength(250)]
        public string? CancellationReason { get; set; }

        // Filled in when this booking has to be mirrored to, or confirmed by, an operator's
        // own ERP (i.e. the operator's InventoryMode is ExternalApiManaged/Hybrid).
        [MaxLength(120)]
        public string? ExternalBookingKey { get; set; }

        [MaxLength(120)]
        public string? ExternalPnr { get; set; }

        public bool RequiresExternalConfirmation { get; set; } // True until their system confirms the seat is really held for us.
        public DateTime? ExternalConfirmedAtUtc { get; set; }

        public BusOperator BusOperator { get; set; } = default!;
        public Trip Trip { get; set; } = default!;
        public SeatHold? SeatHold { get; set; }
        public CustomerProfile? CustomerProfile { get; set; }
        public SalesCounter? SalesCounter { get; set; }
        public Agent? Agent { get; set; }
        public Terminal BoardingTerminal { get; set; } = default!;
        public Terminal DroppingTerminal { get; set; } = default!;
        public Coupon? Coupon { get; set; }
        public ICollection<BookingPassenger> Passengers { get; set; } = new List<BookingPassenger>();
        public ICollection<TripSeat> TripSeats { get; set; } = new List<TripSeat>();
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
        public ICollection<CancellationRequest> CancellationRequests { get; set; } = new List<CancellationRequest>();
        public ICollection<CouponUsage> CouponUsages { get; set; } = new List<CouponUsage>();
        public ICollection<Complaint> Complaints { get; set; } = new List<Complaint>();
        public ICollection<ExternalBookingMapping> ExternalBookingMappings { get; set; } = new List<ExternalBookingMapping>();

        // Moves a booking from "waiting on payment" to "locked in". Kept as a method (instead
        // of just setting Status from outside) so the rule "you can't confirm an already-
        // completed booking" lives in one place.
        public void Confirm()
        {
            if (Status != BookingStatus.PendingPayment && Status != BookingStatus.Draft)
            {
                throw new InvalidOperationException("Only draft or pending-payment bookings can be confirmed.");
            }

            Status = BookingStatus.Confirmed;
            ConfirmedAtUtc = DateTime.UtcNow;
        }

        public void Cancel(string? reason = null)
        {
            if (Status == BookingStatus.Completed)
            {
                throw new InvalidOperationException("Completed bookings cannot be cancelled.");
            }

            Status = BookingStatus.Cancelled;
            CancelledAtUtc = DateTime.UtcNow;
            CancellationReason = reason;
        }

        // The ONE formula for GrandTotal in the codebase (Piece 2 + Piece 3 fix). Both
        // BookingsController.Create (after resolving TaxAmount) and
        // CouponRedemptionService.RedeemAsync (after setting DiscountAmount) call this instead
        // of each re-deriving the sum by hand, so the two pricing paths can never drift apart.
        public void RecomputeTotals()
        {
            GrandTotal = SubTotal - DiscountAmount + TaxAmount + ServiceChargeAmount;
        }
    }
}

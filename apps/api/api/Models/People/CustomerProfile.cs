using TicketPortal.Api.Models.Common;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Models.Marketing;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TicketPortal.Api.Models.Bookings;

namespace TicketPortal.Api.Models.People
{
    // The business-side profile for a CUSTOMER, attached one-to-one to a login account
    // (ApplicationUser). Things like date of birth, addresses and bookings live here instead
    // of on the login account itself, keeping "how do I log in" separate from "who is this person".
    public class CustomerProfile : AuditableEntity
    {
        public Guid UserId { get; set; }

        [MaxLength(30)]
        public string? NationalIdNumber { get; set; }

        public DateOnly? DateOfBirth { get; set; }
        public Gender Gender { get; set; } = Gender.Unknown;

        [MaxLength(30)]
        public string? EmergencyContactPhone { get; set; }

        // This is a CACHED total, not the real source of truth — it should always equal
        // SUM(Amount) over this customer's WalletTransactions below. Never change this number
        // directly from application code; always go through CustomerWalletService, which
        // writes a WalletTransaction row and updates this field together, in one step, so the
        // two can never drift apart.
        public decimal WalletBalance { get; set; }

        [MaxLength(10)]
        public string? PreferredLanguageCode { get; set; }

        public ApplicationUser User { get; set; } = default!;
        public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();
        public ICollection<EmergencyContact> EmergencyContacts { get; set; } = new List<EmergencyContact>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Complaint> Complaints { get; set; } = new List<Complaint>();
        // The full, itemised history behind WalletBalance above — every top-up, spend and refund.
        public ICollection<CustomerWalletTransaction> WalletTransactions { get; set; } = new List<CustomerWalletTransaction>();
    }
}

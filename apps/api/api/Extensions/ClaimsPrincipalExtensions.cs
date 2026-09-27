using TicketPortal.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Extensions
{
    // The operator-scoping pattern from the Completion Plan (Section 2), lifted into one shared
    // helper so Pieces 5 and 6 don't each reimplement it slightly differently. Every controller
    // that needs to tell "sees everything" apart from "only this one operator's own rows" calls
    // this after already gating on User.IsInRole("Admin"/"Staff"/"Operator") — see usage note
    // below. (Corrected during Piece 5: CreateStaffAccountDto in AdminDtos.cs is explicit that
    // "Operator" — not "Staff" — is the actual login role for an operator's own staff, so a gate
    // that only checked Admin/Staff would lock every legitimate operator account out entirely.)
    public static class ClaimsPrincipalExtensions
    {
        // Returns:
        //   null      — either no StaffProfile exists for this user at all (e.g. an Admin
        //               account, which doesn't need one), or one exists with
        //               BusOperatorId == null (our own platform staff). Both cases mean the
        //               same thing to a caller: "don't filter, see everything."
        //   non-null  — this account belongs to exactly one BusOperator's own staff; callers
        //               should filter their query down to that operator's rows only.
        //
        // It's safe that "no profile" and "platform staff" collapse to the same null result —
        // this method only decides HOW MUCH access to grant, never WHETHER to grant any. Every
        // caller is expected to have already rejected plain Customer accounts with an
        // IsInRole("Admin"/"Staff"/"Operator") check before ever calling this.
        public static async Task<Guid?> GetBusOperatorIdAsync(this ClaimsPrincipal user, AppDbContext db)
        {
            var claim = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId)) return null;

            return await db.StaffProfiles
                .Where(sp => sp.UserId == userId)
                .Select(sp => sp.BusOperatorId)
                .FirstOrDefaultAsync();
        }

        // The other half of the pattern: not just WHO the caller's operator is, but whether
        // they're allowed to manage/see a specific operator's data at all. Consolidated here
        // (Piece 2) so BusOperatorsController/TripsController/BusesController's near-identical
        // private copies, and Piece 1's newly-scoped finance controllers, all go through one
        // mechanism instead of three-plus slightly different reimplementations.
        //
        // Admin: always true. Staff or Operator whose StaffProfile.BusOperatorId is null
        // (platform staff): always true — they see everything, same as Admin. Staff/Operator
        // scoped to one BusOperator: only true for that operator's own Id. Anyone else
        // (Customer, or no StaffProfile at all): always false.
        //
        // Callers still gate on IsInRole("Admin"/"Staff"/"Operator") themselves first when the
        // decision also affects an unfiltered list response (e.g. "return empty array vs. run
        // a scoped query") — this method only answers the "which operator(s)" half.
        public static async Task<bool> CanManageOperatorAsync(this ClaimsPrincipal user, AppDbContext db, Guid busOperatorId)
        {
            if (user.IsInRole("Admin")) return true;
            if (!user.IsInRole("Staff") && !user.IsInRole("Operator")) return false;

            var callerOperatorId = await user.GetBusOperatorIdAsync(db);
            return callerOperatorId == null || callerOperatorId == busOperatorId;
        }

        // For data that's platform-internal regardless of which operator it's about (ERP
        // sync/integration bookkeeping — see ExternalBookingMappingsController and friends):
        // Admin always qualifies; a Staff/Operator account only qualifies when it's platform
        // staff (StaffProfile.BusOperatorId == null). An operator's own scoped Staff/Operator
        // account never qualifies here, unlike CanManageOperatorAsync above — there is no
        // operator id to scope down to, because this data was never meant to open up to
        // operator-scoped staff at all.
        public static async Task<bool> IsPlatformStaffOrAdminAsync(this ClaimsPrincipal user, AppDbContext db)
        {
            if (user.IsInRole("Admin")) return true;
            if (!user.IsInRole("Staff") && !user.IsInRole("Operator")) return false;

            var callerOperatorId = await user.GetBusOperatorIdAsync(db);
            return callerOperatorId == null;
        }
    }
}

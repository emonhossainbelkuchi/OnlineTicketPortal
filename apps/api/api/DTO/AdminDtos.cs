using TicketPortal.Api.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // POST /api/admin/users/{userId}/roles — Admin-only. Replaces whatever role(s) a user
    // currently has with exactly this one, so an account can't end up straddling two
    // permission tiers by accident (e.g. both "Customer" and "Staff" at once).
    public class AssignRoleDto
    {
        [Required]
        public string Role { get; set; } = string.Empty; // one of: Admin, Staff, Operator, Customer
    }

    public class AssignRoleResponseDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    }

    // POST /api/admin/staff — Admin-only. Creates the login (ApplicationUser) AND the business
    // profile (StaffProfile) together, so BusOperatorId is correct from the very first moment
    // the account exists. See AdminController for why this has to be separate from the public
    // /api/account/register endpoint.
    public class CreateStaffAccountDto
    {
        [Required, MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        [Required, MaxLength(120)]
        public string UserName { get; set; } = string.Empty;

        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        // "Staff" for our own platform staff, "Operator" for an operator's own staff, or
        // "Admin" — never "Customer" here, that's what /api/account/register is for.
        [Required]
        public string Role { get; set; } = string.Empty;

        // Null = platform staff (sees everything downstream). Set = this account only ever
        // sees that one BusOperator's own data. See ClaimsPrincipalExtensions.GetBusOperatorIdAsync.
        public Guid? BusOperatorId { get; set; }

        [Required, MaxLength(50)]
        public string EmployeeCode { get; set; } = string.Empty;

        // The person's JOB (StaffRole enum) — separate from Role above, which is their LOGIN
        // permission. See StaffProfile's own class comment for why these aren't the same thing.
        public StaffRole JobRole { get; set; }
    }

    public class CreateStaffAccountResponseDto
    {
        public Guid UserId { get; set; }
        public Guid StaffProfileId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid? BusOperatorId { get; set; }
    }

    // GET /api/admin/users — Admin-only. Nothing else in the API lists login accounts at all,
    // which meant an Admin had no way to actually FIND a userId to pass into AssignRole above
    // without going through Swagger/SQL by hand. Backs Piece 7's User & Role Management screen.
    public class AdminUserListItemDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? LastLoginAtUtc { get; set; }
        public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();

        // Resolved from StaffProfile.BusOperatorId when this account has one — null for
        // platform-wide Staff/Admin accounts or a Customer, same meaning as everywhere else
        // this field shows up (see ClaimsPrincipalExtensions.GetBusOperatorIdAsync).
        public Guid? BusOperatorId { get; set; }
    }
}

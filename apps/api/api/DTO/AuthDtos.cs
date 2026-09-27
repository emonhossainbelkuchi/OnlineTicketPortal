using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // POST /api/account/register — creates a row in AspNetUsers via UserManager. No token is
    // issued here; register and login are deliberately separate steps.
    public class RegisterDto
    {
        [Required, MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        [Required, MaxLength(120)]
        public string UserName { get; set; } = string.Empty;

        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    // POST /api/account/login — checked against Identity's password hash; on success,
    // AccountController hands back a signed JWT built from AuthResponseDto below.
    public class LoginDto
    {
        [Required]
        public string UserName { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    // POST /api/account/change-password — [Authorize]'d, so the target user is always "whoever
    // the bearer token belongs to", never a body-supplied id (that would let any logged-in user
    // change anyone else's password just by knowing their id).
    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    // POST /api/account/forgot-password. The response deliberately remains the same whether
    // the email exists or not, so this endpoint cannot be used to enumerate customer accounts.
    public class ForgotPasswordDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    // POST /api/account/reset-password. Token is the URL-safe, encoded Identity reset token
    // supplied in the reset link; it is never an application password or a user id.
    public class ResetPasswordDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty;

        [Required, MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        // Paste this into Postman's Authorization tab as a Bearer token for every other endpoint.
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;

        // Embedded as claims in the token too, so [Authorize(Roles = "...")] can check them
        // without a database round-trip on every request.
        public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    }

    // GET /api/account/me — RBAC Amendment v3 task 7. The token's Roles claim (Admin/Staff/
    // Customer) is only ever half the story; this is the fresh, database-resolved answer to
    // "what can I actually do right now" that the Angular guards and shells build their
    // permission checks against, instead of trusting whatever was true when the token was
    // issued (which a role change, deactivation, or revoked counter assignment can go stale on
    // mid-session).
    public class SessionInfoDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;

        // "Admin" | "Staff" | "UnprovisionedStaff" | "Customer" — see Authorization.ActorType.
        public string ActorType { get; set; } = string.Empty;

        // Only set when ActorType == "Staff".
        public string? JobRole { get; set; }
        public Guid? BusOperatorId { get; set; }
        public string? BusOperatorName { get; set; }

        // Every SalesCounter this session currently has an active assignment to (CounterStaff
        // only — see CurrentActor.AssignedCounterIds).
        public IReadOnlyCollection<SessionCounterDto> AssignedCounters { get; set; } = Array.Empty<SessionCounterDto>();

        // The flat, resolved permission set the Angular guards check against. Empty for Admin
        // — Admin implicitly passes every check, see CurrentActor.HasPermission.
        public IReadOnlyCollection<string> Permissions { get; set; } = Array.Empty<string>();
    }

    public class SessionCounterDto
    {
        public Guid Id { get; set; }
        public string CounterName { get; set; } = string.Empty;
    }
}

using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Diagnostics;
using TicketPortal.Api.Models.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using TicketPortal.Api.Services;

namespace TicketPortal.Api.Controllers
{
    // Register creates a user through Identity; Login checks the password and hands back a
    // signed JWT carrying the user's Guid id (NameIdentifier) and their roles, so downstream
    // controllers can use both [Authorize] and [Authorize(Roles = "...")].
    // Deliberately NOT [Authorize] — this is the one controller that has to be reachable
    // without a token, since it's what ISSUES the token in the first place.
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController(
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        AppDbContext db,
        IPasswordResetMessageSender passwordResetMessageSender,
        ICurrentActorService currentActor,
        ILogger<AccountController> logger) : ControllerBase
    {
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var user = new ApplicationUser
            {
                UserName = dto.UserName,
                Email = dto.Email,
                FullName = dto.FullName
            };

            var result = await userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            // Matches the role semantics DbSeeder.SeedRolesAsync already documents: every
            // public self-signup account is a Customer. A role-assignment failure here (e.g.
            // the seeded "Customer" role is somehow missing) shouldn't undo an
            // otherwise-successful account creation, but it's surfaced in the response instead
            // of failing silently, since it means the account was created without the role its
            // own creation path is supposed to guarantee.
            var roleResult = await userManager.AddToRoleAsync(user, "Customer");
            if (!roleResult.Succeeded)
            {
                return StatusCode(201,
                    $"User '{user.UserName}' created, but role assignment failed: " +
                    string.Join("; ", roleResult.Errors.Select(e => e.Description)));
            }

            return StatusCode(201, $"User '{user.UserName}' created.");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await userManager.FindByNameAsync(dto.UserName);

            // Only a real user (found by username) has anything to attribute a LoginHistory row
            // to, or a lockout counter to check — LoginHistory.UserId is a required FK, and
            // Identity's failed-attempt counter lives on the ApplicationUser row itself. A
            // completely unknown username has neither, same as it always did.
            if (user == null)
            {
                return Unauthorized("Invalid username or password");
            }

            // Accounts are disabled (IsActive = false) rather than deleted. Login never looked at
            // that flag, so a disabled account could still sign in.
            if (!user.IsActive)
            {
                return Unauthorized("This account has been disabled. Please contact support.");
            }

            // Piece 4: checked BEFORE the password itself. Once options.Lockout.MaxFailedAccessAttempts
            // (Program.cs) has been hit, even the correct password must be rejected until the
            // lockout window expires — otherwise a brute-force run just keeps guessing at full
            // speed forever. Still logged below like any other failed attempt.
            if (await userManager.IsLockedOutAsync(user))
            {
                db.LoginHistories.Add(new LoginHistory
                {
                    UserId = user.Id,
                    LoginAtUtc = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    Success = false,
                });
                await db.SaveChangesAsync();

                return StatusCode(StatusCodes.Status423Locked,
                    "This account is temporarily locked after too many failed login attempts. Please try again later.");
            }

            var passwordOk = await userManager.CheckPasswordAsync(user, dto.Password);

            // AccessFailedAsync / ResetAccessFailedCountAsync are what actually drive the
            // lockout: the former bumps Identity's failed-attempt counter (and sets LockoutEnd
            // once MaxFailedAccessAttempts is reached, per the options in Program.cs); the
            // latter clears that counter back to zero on a genuine success, so someone who
            // mistypes their password once isn't penalized for it later.
            if (passwordOk)
            {
                await userManager.ResetAccessFailedCountAsync(user);
            }
            else
            {
                await userManager.AccessFailedAsync(user);
            }

            // A found user with the wrong password still gets a Success = false row, which is
            // the actual security-relevant case this trail exists for.
            db.LoginHistories.Add(new LoginHistory
            {
                UserId = user.Id,
                LoginAtUtc = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                Success = passwordOk,
            });
            await db.SaveChangesAsync();

            if (!passwordOk)
            {
                // Deliberately the same generic message an unknown username gets — this
                // doesn't say whether it was the password or a just-triggered lockout, so an
                // attacker can't use the response to tell those apart.
                return Unauthorized("Invalid username or password");
            }

            var authenticatedUser = user;
            var roles = await userManager.GetRolesAsync(authenticatedUser);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, authenticatedUser.Id.ToString()),
                new(ClaimTypes.Name, authenticatedUser.UserName!)
            };
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(configuration["JWT:SigningKey"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiresAtUtc = DateTime.UtcNow.AddHours(3);

            var token = new JwtSecurityToken(
                issuer: configuration["JWT:Issuer"],
                audience: configuration["JWT:Audience"],
                claims: claims,
                expires: expiresAtUtc,
                signingCredentials: creds);

            return Ok(new AuthResponseDto
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                ExpiresAtUtc = expiresAtUtc,
                UserId = authenticatedUser.Id,
                UserName = authenticatedUser.UserName!,
                // GetRolesAsync returns IList<string>, which does NOT implicitly convert to
                // IReadOnlyCollection<string> — .ToList() here is required to compile, not optional.
                Roles = roles.ToList()
            });
        }

        // [Authorize] on the action, not the class — this stays the one controller that's
        // reachable without a token (see the class-level comment above); this is just the one
        // action on it that needs an existing, valid token to know WHOSE password to change.
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
        {
            // Same NameIdentifier-claim pattern BookingsController.ResolveOrCreateCustomerProfileIdAsync
            // uses — the target user always comes from the bearer token, never the request body.
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(claim, out var userId))
            {
                return Unauthorized();
            }

            var user = await userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return Unauthorized();
            }

            // ChangePasswordAsync itself verifies dto.CurrentPassword against the stored hash
            // before applying dto.NewPassword — this one call does both the "prove you're really
            // you" check and the update, so there's no separate CheckPasswordAsync step needed.
            var result = await userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors.Select(e => e.Description));
            }

            return NoContent();
        }

        // RBAC Amendment v3 task 7 — see SessionInfoDto's doc comment. Resolved fresh on every
        // call via CurrentActorService, so a role change or counter-assignment revocation is
        // reflected the very next time the client asks, without waiting for the JWT to expire.
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var actor = await currentActor.ResolveAsync(User);
            if (actor.Type == Authorization.ActorType.Anonymous) return Unauthorized();

            var user = await userManager.FindByIdAsync(actor.UserId.ToString());
            if (user == null) return Unauthorized();

            string? busOperatorName = null;
            if (actor.BusOperatorId != null)
            {
                busOperatorName = await db.BusOperators
                    .Where(o => o.Id == actor.BusOperatorId)
                    .Select(o => o.Name)
                    .FirstOrDefaultAsync();
            }

            var assignedCounters = actor.AssignedCounterIds.Count == 0
                ? Array.Empty<SessionCounterDto>()
                : await db.SalesCounters
                    .Where(c => actor.AssignedCounterIds.Contains(c.Id))
                    .Select(c => new SessionCounterDto { Id = c.Id, CounterName = c.CounterName })
                    .ToArrayAsync();

            return Ok(new SessionInfoDto
            {
                UserId = actor.UserId,
                UserName = user.UserName ?? string.Empty,
                FullName = user.FullName,
                ActorType = actor.Type.ToString(),
                JobRole = actor.JobRole?.ToString(),
                BusOperatorId = actor.BusOperatorId,
                BusOperatorName = busOperatorName,
                AssignedCounters = assignedCounters,
                Permissions = actor.Permissions,
            });
        }
    //It uses ASP.NET Identity's
        // one-time, time-limited reset token rather than storing a recoverable password or
        // inventing a second token scheme. Keep the success response generic to prevent email
        // address enumeration.
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)
        {
            var user = await userManager.FindByEmailAsync(dto.Email.Trim());
            if (user is not null && !string.IsNullOrWhiteSpace(user.Email))
            {
                var identityToken = await userManager.GeneratePasswordResetTokenAsync(user);
                var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(identityToken));
                var clientBaseUrl = configuration["PasswordReset:PublicAppUrl"]?.TrimEnd('/')
                    ?? "http://localhost:4200";
                var resetUrl = $"{clientBaseUrl}/auth/reset-password?email=" +
                    $"{Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(encodedToken)}";

                try
                {
                    await passwordResetMessageSender.SendAsync(user, resetUrl);
                }
                catch (Exception ex)
                {
                    // Do not turn a mail-delivery issue into an account-existence oracle. The
                    // operational error is retained in the API log for the team to action.
                    logger.LogError(ex, "Could not deliver password-reset instructions for user {UserId}", user.Id);
                }
            }

            return Ok(new
            {
                message = "If an account uses that email address, password-reset instructions have been sent."
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
        {
            var user = await userManager.FindByEmailAsync(dto.Email.Trim());
            if (user is null)
            {
                return BadRequest(new { message = "This reset link is invalid or has expired." });
            }

            string identityToken;
            try
            {
                identityToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token));
            }
            catch (FormatException)
            {
                return BadRequest(new { message = "This reset link is invalid or has expired." });
            }

            var result = await userManager.ResetPasswordAsync(user, identityToken, dto.NewPassword);
            if (!result.Succeeded)
            {
                return BadRequest(new
                {
                    message = "This reset link is invalid or has expired.",
                    errors = result.Errors.Select(error => error.Description)
                });
            }

            // A reset should also clear a lockout caused by forgotten credentials, otherwise a
            // user can choose a valid new password but still remain locked out.
            await userManager.ResetAccessFailedCountAsync(user);
            return NoContent();
        }
    }
}

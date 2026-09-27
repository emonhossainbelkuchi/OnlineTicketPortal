using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Bookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace TicketPortal.Api.Controllers
{
    // Master = CancellationPolicy, Details = CancellationPolicyRule (tiered refund rules).
    // BusOperatorId is nullable and NOT resolved from anything else — unlike Booking's
    // BusOperatorId (looked up from Trip), a policy can genuinely stand alone as a
    // platform-wide default with no operator at all.
    //
    // Authorization: previously Create/Update/Delete had NO role/ownership check whatsoever —
    // any logged-in customer could create or edit a cancellation policy for any operator, or
    // even a platform-wide (BusOperatorId == null) one. Writes are now operator-scoped: an
    // operator's own staff may only manage their own operator's policies, never a null
    // (platform-wide) one; platform Admin/Staff may manage any policy, including platform-wide.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CancellationPoliciesController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
    {
        // See BusesController.GetAll for why materializing (.ToListAsync()) has to happen
        // BEFORE mapping with ToResponseDto — EF Core can't translate that method into SQL.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var policies = await db.CancellationPolicies.Include(p => p.Rules).ToListAsync();
            return Ok(policies.Select(ToResponseDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var policy = await db.CancellationPolicies.Include(p => p.Rules).FirstOrDefaultAsync(p => p.Id == id);
            return policy == null ? NotFound() : Ok(ToResponseDto(policy));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CancellationPolicyCreateDto dto)
        {
            // ----------------------------------------
            // 1. Authorization — operator scoping
            // ----------------------------------------
            if (!await CanManagePolicyOperatorAsync(dto.BusOperatorId))
            {
                return Forbid();
            }

            // ----------------------------------------
            // 2. Validate BusOperator if provided (Update already did this; Create hadn't)
            // ----------------------------------------
            if (dto.BusOperatorId.HasValue)
            {
                var operatorExists = await db.BusOperators.AnyAsync(o => o.Id == dto.BusOperatorId.Value);
                if (!operatorExists)
                {
                    return BadRequest(new { message = "The specified BusOperatorId does not exist." });
                }
            }

            var policy = new CancellationPolicy
            {
                BusOperatorId = dto.BusOperatorId,
                Name = dto.Name,
                Description = dto.Description,
                EffectiveFromUtc = dto.EffectiveFromUtc,
                EffectiveToUtc = dto.EffectiveToUtc,
                Rules = dto.Rules.Select(r => new CancellationPolicyRule
                {
                    MinHoursBeforeDeparture = r.MinHoursBeforeDeparture,
                    MaxHoursBeforeDeparture = r.MaxHoursBeforeDeparture,
                    RefundPercentage = r.RefundPercentage,
                    FixedCancellationFee = r.FixedCancellationFee
                }).ToList()
            };

            db.CancellationPolicies.Add(policy);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = policy.Id }, ToResponseDto(policy));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            Guid id,
            CancellationPolicyUpdateDto dto)
        {
            // ----------------------------------------
            // 1. Load Policy + Rules
            // ----------------------------------------
            var policy = await db.CancellationPolicies
                .Include(p => p.Rules)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (policy == null)
            {
                return NotFound(new
                {
                    message = "CancellationPolicy not found."
                });
            }

            // ----------------------------------------
            // 1a. Authorization — operator scoping, checked against both the policy's current
            // BusOperatorId and dto.BusOperatorId (in case of an attempted reassignment)
            // ----------------------------------------
            if (!await CanManagePolicyOperatorAsync(policy.BusOperatorId) || !await CanManagePolicyOperatorAsync(dto.BusOperatorId))
            {
                return Forbid();
            }

            // ----------------------------------------
            // 2. Validate RowVersion
            // ----------------------------------------
            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
            {
                return BadRequest(new
                {
                    message =
                        "RowVersion is required. " +
                        "GET the CancellationPolicy first and send the latest RowVersion."
                });
            }

            // ----------------------------------------
            // 3. Tell EF which version the client loaded
            // ----------------------------------------
            db.Entry(policy)
                .Property(p => p.RowVersion)
                .OriginalValue = dto.RowVersion;

            // ----------------------------------------
            // 4. Validate Rules
            // ----------------------------------------
            if (dto.Rules == null || dto.Rules.Count == 0)
            {
                return BadRequest(new
                {
                    message = "At least one cancellation policy rule is required."
                });
            }

            // ----------------------------------------
            // 5. Validate BusOperator if provided
            // ----------------------------------------
            if (dto.BusOperatorId.HasValue)
            {
                var operatorExists = await db.BusOperators
                    .AnyAsync(o => o.Id == dto.BusOperatorId.Value);

                if (!operatorExists)
                {
                    return BadRequest(new
                    {
                        message =
                            "The specified BusOperatorId does not exist."
                    });
                }
            }

            // ----------------------------------------
            // 6. Update master fields
            // ----------------------------------------
            policy.BusOperatorId = dto.BusOperatorId;
            policy.Name = dto.Name;
            policy.Description = dto.Description;
            policy.EffectiveFromUtc = dto.EffectiveFromUtc;
            policy.EffectiveToUtc = dto.EffectiveToUtc;
            policy.IsActive = dto.IsActive;

            // Important
            policy.UpdatedAtUtc = DateTime.UtcNow;

            // ----------------------------------------
            // 7. Replace Rules
            // ----------------------------------------
            if (policy.Rules.Any())
            {
                db.CancellationPolicyRules.RemoveRange(policy.Rules);
            }

            var newRules = dto.Rules
                .Select(r => new CancellationPolicyRule
                {
                    CancellationPolicyId = policy.Id,

                    MinHoursBeforeDeparture =
                        r.MinHoursBeforeDeparture,

                    MaxHoursBeforeDeparture =
                        r.MaxHoursBeforeDeparture,

                    RefundPercentage =
                        r.RefundPercentage,

                    FixedCancellationFee =
                        r.FixedCancellationFee
                })
                .ToList();

            await db.CancellationPolicyRules.AddRangeAsync(newRules);

            // ----------------------------------------
            // 8. Save
            // ----------------------------------------
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new
                {
                    message =
                        "This CancellationPolicy was changed by another request. " +
                        "GET the latest CancellationPolicy and retry the update."
                });
            }
            catch (DbUpdateException ex)
            {
                return Conflict(new
                {
                    message =
                        "Could not save this CancellationPolicy update.",

                    detail = ex.InnerException?.Message,

                    innerDetail =
                        ex.InnerException?.InnerException?.Message
                });
            }

            // ----------------------------------------
            // 9. Reload fresh data
            // ----------------------------------------
            var updatedPolicy = await db.CancellationPolicies
                .AsNoTracking()
                .Include(p => p.Rules)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (updatedPolicy == null)
            {
                return NotFound(new
                {
                    message =
                        "CancellationPolicy was updated but could not be loaded again."
                });
            }

            // ----------------------------------------
            // 10. Return fresh response
            // ----------------------------------------
            return Ok(ToResponseDto(updatedPolicy));
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var policy = await db.CancellationPolicies.Include(p => p.Rules).FirstOrDefaultAsync(p => p.Id == id);
            if (policy == null) return NotFound();

            if (!await CanManagePolicyOperatorAsync(policy.BusOperatorId)) return Forbid();

            // CancellationPolicyRule is a pure detail of this policy — Restrict never cascades it.
            db.CancellationPolicyRules.RemoveRange(policy.Rules);
            db.CancellationPolicies.Remove(policy);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("This CancellationPolicy was already modified or deleted by another request.");
            }
            catch (DbUpdateException)
            {
                return Conflict("Cannot delete this CancellationPolicy — another record still references it.");
            }

            return NoContent();
        }

        // Sets PolicyDocumentImageUrl directly — same single-field pattern as Trip.CoverImageUrl
        // and BusOperator.LogoUrl (as opposed to Bus's multi-photo gallery table).
        [HttpPost("{id}/images")]
        public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
        {
            var policy = await db.CancellationPolicies.FindAsync(id);
            if (policy == null) return NotFound();
            if (!await CanManagePolicyOperatorAsync(policy.BusOperatorId)) return Forbid();

            var validationError = TicketPortal.Api.Extensions.FileUploadValidation.Validate(file);
            if (validationError != null) return validationError;

            var fileName = $"policy_{id}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var path = Path.Combine(env.WebRootPath!, "images", fileName);
            await using (var stream = System.IO.File.Create(path))
            {
                await file.CopyToAsync(stream);
            }

            policy.PolicyDocumentImageUrl = $"/images/{fileName}";
            await db.SaveChangesAsync();
            return Ok(new { imageUrl = policy.PolicyDocumentImageUrl });
        }

        private static CancellationPolicyResponseDto ToResponseDto(
            CancellationPolicy policy) => new()
            {
                Id = policy.Id,

                BusOperatorId = policy.BusOperatorId,

                Name = policy.Name,

                Description = policy.Description,
                EffectiveFromUtc = policy.EffectiveFromUtc,
                EffectiveToUtc = policy.EffectiveToUtc,

                IsActive = policy.IsActive,

                CreatedAtUtc = policy.CreatedAtUtc,

                UpdatedAtUtc = policy.UpdatedAtUtc,

                DeletedAtUtc = policy.DeletedAtUtc,

                PolicyDocumentImageUrl = policy.PolicyDocumentImageUrl,

                RowVersion = policy.RowVersion,

                Rules = policy.Rules
                .Select(r => new CancellationPolicyRuleResponseDto
                {
                    Id = r.Id,

                    MinHoursBeforeDeparture =
                        r.MinHoursBeforeDeparture,

                    MaxHoursBeforeDeparture =
                        r.MaxHoursBeforeDeparture,

                    RefundPercentage =
                        r.RefundPercentage,

                    FixedCancellationFee =
                        r.FixedCancellationFee
                })
                .ToList()
            };

        // =========================================================
        // Auth helpers — duplicated per-controller (see the same note in TripsController)
        // until Piece 1 introduces a shared ClaimsPrincipalExtensions.GetBusOperatorId helper.
        // =========================================================

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claim, out var id) ? id : null;
        }

        private async Task<Guid?> GetCallerBusOperatorIdAsync()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return null;

            return await db.StaffProfiles
                .Where(sp => sp.UserId == userId.Value)
                .Select(sp => sp.BusOperatorId)
                .FirstOrDefaultAsync();
        }

        // Admin: manages any policy, including platform-wide (null) ones. Platform Staff
        // (StaffProfile.BusOperatorId == null): same. Operator-scoped Staff/Operator: only their
        // own operator's policies — never a null/platform-wide policy. Anyone else: never.
        //
        // Fixed for Piece 4 (Operator & Fleet Management Panel — Fare & Cancellation Policy
        // Config screen): this only checked IsInRole("Staff"), the same class of bug already
        // fixed elsewhere in this codebase (see ClaimsPrincipalExtensions.CanManageOperatorAsync's
        // header comment) — "Operator" is the actual login role for an operator's own staff, so
        // without this an Operator account could never save a cancellation policy at all,
        // including for their own operator, and would always get Forbid().
        private async Task<bool> CanManagePolicyOperatorAsync(Guid? busOperatorId)
        {
            if (User.IsInRole("Admin")) return true;
            if (!User.IsInRole("Staff") && !User.IsInRole("Operator")) return false;

            var callerOperatorId = await GetCallerBusOperatorIdAsync();
            if (callerOperatorId == null) return true;
            return busOperatorId == callerOperatorId;
        }
    }
}

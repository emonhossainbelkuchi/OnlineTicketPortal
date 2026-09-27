using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Extensions;
using TicketPortal.Api.Models.CompanyNetwork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Master = BusOperator, Details = OperatorRoute (the operator's route network).
    // Of the five master-detail controllers in this project, this is the only one whose Create
    // doesn't depend on any of the OTHER four having data already — every OperatorRoute here
    // just needs an existing BusRouteId (the unified route), which is normally seeded once.
    //
    // Authorization: previously NONE of Create/Update/Delete had any role check at all — any
    // logged-in customer could create a fake operator, edit any existing operator's profile
    // (including InventoryMode, which changes how Trips under it behave), or delete one.
    // Onboarding a brand-new operator (Create) and removing one (Delete) are platform-level
    // decisions, same as CommissionRules/OperatorContracts/OperatorSettings elsewhere in this
    // project — so those two are Admin/platform-Staff only. Update/UploadImage (logo) use the
    // regular operator-scoping pattern instead, since it's reasonable for an operator's own
    // staff to keep their own company profile/logo current.
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BusOperatorsController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
    {
        // See BusesController.GetAll for why materializing (.ToListAsync()) has to happen
        // BEFORE mapping with ToResponseDto — EF Core can't translate that method into SQL.
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var operators = await db.BusOperators.Include(o => o.OperatorRoutes).ToListAsync();
            return Ok(operators.Select(ToResponseDto));
        }

        // Anonymous — the public trip search / seat-map header (loadTripHeaderContext's
        // refresh/direct-link fallback) looks up the operator name/logo by id without a
        // logged-in user, same reasoning as TerminalsController/TripsController above.
        [AllowAnonymous]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var op = await db.BusOperators.Include(o => o.OperatorRoutes).FirstOrDefaultAsync(o => o.Id == id);
            return op == null ? NotFound() : Ok(ToResponseDto(op));
        }

        [HttpPost]
        public async Task<IActionResult> Create(BusOperatorCreateDto dto)
        {
            // Onboarding a new operator is a platform decision — an operator's own staff can't
            // exist as "staff of X" before X is created, so this is Admin/platform-Staff only.
            if (!await User.IsPlatformStaffOrAdminAsync(db))
            {
                return Forbid();
            }

            var op = new BusOperator
            {
                Name = dto.Name,
                LegalName = dto.LegalName,
                RegistrationNumber = dto.RegistrationNumber,
                ContactPhone = dto.ContactPhone,
                Email = dto.Email,
                AddressLine = dto.AddressLine,
                City = dto.City,
                District = dto.District,
                Country = dto.Country,
                FoundedYear = dto.FoundedYear,
                RegisteredOnUtc = dto.RegisteredOnUtc,
                InventoryMode = dto.InventoryMode,
                OperatorRoutes = dto.OperatorRoutes.Select(r => new OperatorRoute
                {
                    BusRouteId = r.BusRouteId,
                    OperatorRouteCode = r.OperatorRouteCode,
                    DisplayName = r.DisplayName,
                    InventoryModeOverride = r.InventoryModeOverride
                }).ToList()
            };

            db.BusOperators.Add(op);
            await db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = op.Id }, ToResponseDto(op));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update( Guid id, BusOperatorUpdateDto dto)
        {
            // ==========================================
            // 1. Load BusOperator + existing routes
            // ==========================================

            var op = await db.BusOperators
                .Include(o => o.OperatorRoutes)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (op == null)
            {
                return NotFound(new
                {
                    message = "BusOperator not found."
                });
            }

            // ==========================================
            // 1a. Authorization — operator scoping
            // ==========================================

            if (!await User.CanManageOperatorAsync(db, op.Id))
            {
                return Forbid();
            }


            // ==========================================
            // 2. Validate BusOperator RowVersion
            // ==========================================

            if (dto.RowVersion == null || dto.RowVersion.Length == 0)
            {
                return BadRequest(new
                {
                    message = "BusOperator RowVersion is required."
                });
            }

            if (!op.RowVersion.SequenceEqual(dto.RowVersion))
            {
                return Conflict(new
                {
                    message =
                        "This BusOperator was changed by another request. " +
                        "Please GET the latest data and try again."
                });
            }

            // Tell EF which version the client originally received
            db.Entry(op)
                .Property(x => x.RowVersion)
                .OriginalValue = dto.RowVersion;


            // ==========================================
            // 3. Update BusOperator
            // ==========================================

            op.Name = dto.Name;
            op.LegalName = dto.LegalName;
            op.RegistrationNumber = dto.RegistrationNumber;
            op.ContactPhone = dto.ContactPhone;
            op.Email = dto.Email;
            op.AddressLine = dto.AddressLine;
            op.City = dto.City;
            op.District = dto.District;
            op.Country = dto.Country;
            op.FoundedYear = dto.FoundedYear;
            op.RegisteredOnUtc = dto.RegisteredOnUtc;
            op.InventoryMode = dto.InventoryMode;
            op.IsActive = dto.IsActive;


            try
            {
                // ==========================================
                // 4. Incoming route IDs
                // ==========================================

                var incomingRouteIds = dto.OperatorRoutes
                    .Where(r => r.Id.HasValue)
                    .Select(r => r.Id!.Value)
                    .ToHashSet();


                // ==========================================
                // 5. Find removed routes
                // ==========================================

                var routesToRemove = op.OperatorRoutes
                    .Where(existing => !incomingRouteIds.Contains(existing.Id))
                    .ToList();


                // ==========================================
                // 6. Handle removed routes
                // ==========================================

                foreach (var route in routesToRemove)
                {
                    var hasTrips = await db.Trips.AnyAsync(x => x.OperatorRouteId == route.Id);
                    var hasSchedules = await db.Schedules.AnyAsync(x => x.OperatorRouteId == route.Id);
                    var hasStops = await db.OperatorRouteStops.AnyAsync(x => x.OperatorRouteId == route.Id);
                    var hasExternalMappings = await db.ExternalRouteMappings.AnyAsync(x => x.OperatorRouteId == route.Id);

                    if (hasTrips ||
                        hasSchedules ||
                        hasStops ||
                        hasExternalMappings)
                    {
                        // Keep historical route.
                        route.IsActive = false;
                    }
                    else
                    {
                        // Safe to physically delete.
                        db.OperatorRoutes.Remove(route);
                    }
                }


                // ==========================================
                // 7. Update existing routes / Add new routes
                // ==========================================

                foreach (var routeDto in dto.OperatorRoutes)
                {
                    // ======================================
                    // Existing route
                    // ======================================

                    if (routeDto.Id.HasValue)
                    {
                        var existingRoute = op.OperatorRoutes
                            .FirstOrDefault(x => x.Id == routeDto.Id.Value);

                        if (existingRoute == null)
                        {
                            return BadRequest(new
                            {
                                message =
                                    $"OperatorRoute {routeDto.Id} does not belong to this BusOperator."
                            });
                        }


                        // ==================================
                        // OperatorRoute RowVersion
                        // ==================================

                        if (routeDto.RowVersion == null ||
                            routeDto.RowVersion.Length == 0)
                        {
                            return BadRequest(new
                            {
                                message =
                                    $"RowVersion is required for OperatorRoute {routeDto.Id}."
                            });
                        }


                        if (!existingRoute.RowVersion
                            .SequenceEqual(routeDto.RowVersion))
                        {
                            return Conflict(new
                            {
                                message =
                                    $"OperatorRoute {routeDto.Id} was changed by another request. " +
                                    "Please GET the latest data and try again.",

                                entity = "OperatorRoute",

                                id = existingRoute.Id
                            });
                        }


                        // Tell EF original RowVersion
                        db.Entry(existingRoute)
                            .Property(x => x.RowVersion)
                            .OriginalValue = routeDto.RowVersion;

                        // ==================================
                        // Update existing route
                        // ==================================

                        existingRoute.BusRouteId = routeDto.BusRouteId;
                        existingRoute.OperatorRouteCode = routeDto.OperatorRouteCode;
                        existingRoute.DisplayName = routeDto.DisplayName;
                        existingRoute.InventoryModeOverride = routeDto.InventoryModeOverride;
                        existingRoute.IsActive = routeDto.IsActive;
                    }


                    // ======================================
                    // New route
                    // ======================================

                    else
                    {
                        var newRoute = new OperatorRoute
                        {
                            BusOperatorId = op.Id,
                            BusRouteId = routeDto.BusRouteId,
                            OperatorRouteCode = routeDto.OperatorRouteCode,
                            DisplayName = routeDto.DisplayName,
                            InventoryModeOverride = routeDto.InventoryModeOverride,
                            IsActive = routeDto.IsActive
                        };
                        await db.OperatorRoutes.AddAsync(newRoute);
                    }
                }


                // ==========================================
                // 8. Save everything
                // ==========================================

                await db.SaveChangesAsync();


                // ==========================================
                // 9. Reload BusOperator
                // ==========================================

                await db.Entry(op)
                    .ReloadAsync();


                // ==========================================
                // 10. Reload OperatorRoutes
                // ==========================================

                await db.Entry(op)
                    .Collection(x => x.OperatorRoutes)
                    .LoadAsync();


                // ==========================================
                // 11. Return response
                // ==========================================

                return Ok(ToResponseDto(op));
            }
            catch (DbUpdateConcurrencyException ex)
            {
                return Conflict(new
                {
                    message = "Concurrency conflict.",

                    entities = ex.Entries
                        .Select(e => e.Entity.GetType().Name)
                        .Distinct()
                        .ToList()
                });
            }
            catch (DbUpdateException ex)
            {
                var error =
                    ex.InnerException?.InnerException?.Message
                    ?? ex.InnerException?.Message
                    ?? ex.Message;

                return Conflict(new
                {
                    message = "Could not save BusOperator.",
                    details = error
                });
            }
        }
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var op = await db.BusOperators.Include(o => o.OperatorRoutes).FirstOrDefaultAsync(o => o.Id == id);
            if (op == null) return NotFound();

            // Removing an operator entirely (even the soft-delete path, which also deactivates
            // every one of its Buses) is a platform-level decision, same rationale as Create.
            if (!await User.IsPlatformStaffOrAdminAsync(db))
            {
                return Forbid();
            }

            // Check the tables that actually block a hard delete under Restrict, and that a real
            // exam/demo dataset will have rows in. OperatorRoutes are a pure "detail" of this
            // operator (same as Update() already handles) — they never block anything, so they're
            // just removed below regardless of which path we take.
            var hasBuses = await db.Buses.AnyAsync(b => b.BusOperatorId == id);
            var hasTrips = await db.Trips.AnyAsync(t => t.BusOperatorId == id);
            var hasCancellationPolicies = await db.CancellationPolicies.AnyAsync(p => p.BusOperatorId == id);

            if (hasBuses || hasTrips || hasCancellationPolicies)
            {
                // Don't cascade-delete: a real operator's Buses/Trips can have Bookings and
                // financial history hanging off them, and letting DELETE tear through all of that
                // would destroy customer/financial records. Soft-delete instead — MarkDeleted()
                // flips IsDeleted, which hides this operator from every normal query (the global
                // filter in AppDbContext) without removing a single row from the database.
                op.IsActive = false;
                op.MarkDeleted();

                // Keep the picture consistent: deactivate every Bus this operator owns too, so a
                // "removed" operator doesn't leave its buses looking independently active. Buses
                // are only deactivated, never soft-deleted here — if one of them also has Trips
                // referencing it, that's BusesController's own Delete() call to make.
                var buses = await db.Buses.Where(b => b.BusOperatorId == id).ToListAsync();
                foreach (var bus in buses)
                {
                    bus.IsActive = false;
                }

                try
                {
                    await db.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    return Conflict("This BusOperator was already modified or deleted by another request.");
                }

                return Ok(new
                {
                    message = "This BusOperator still has Buses, Trips, or CancellationPolicies attached to it, so it can't be permanently deleted without destroying that history. It has been deactivated instead — hidden from all normal queries, with its Buses marked inactive — but nothing was destroyed.",
                    softDeleted = true
                });
            }

            // Nothing depends on this operator — safe to actually remove the row.
            db.OperatorRoutes.RemoveRange(op.OperatorRoutes);
            db.BusOperators.Remove(op);

            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict("This BusOperator was already modified or deleted by another request.");
            }
            catch (DbUpdateException)
            {
                // Safety net for anything outside the three checks above (e.g. a finance or
                // integration row from elsewhere in the schema) that still references this operator.
                return Conflict("Cannot delete this BusOperator — something still references it. Try again shortly; if this persists, contact support.");
            }

            return NoContent();
        }

        // Sets the operator's logo — mirrors Trip's single-field image pattern.
        [HttpPost("{id}/images")]
        public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
        {
            var op = await db.BusOperators.FindAsync(id);
            if (op == null) return NotFound(new { message = "BusOperator not found." });
            if (!await User.CanManageOperatorAsync(db, op.Id)) return Forbid();

            var validationError = TicketPortal.Api.Extensions.FileUploadValidation.Validate(file);
            if (validationError != null) return validationError;

            // wwwroot check
            if (string.IsNullOrEmpty(env.WebRootPath)) return StatusCode(500, new { message = "WebRootPath is not configured." });

            // Create wwwroot/images if it doesn't exist
            var uploadsFolder = Path.Combine(env.WebRootPath, "images");

            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var extension = Path.GetExtension(file.FileName);

            var fileName = $"operator_{id}_{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);
            // Save file
            await using (var stream = new FileStream( filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Save URL in database
            op.LogoUrl = $"/images/{fileName}";

            await db.SaveChangesAsync();
            return Ok(new { message = "Image uploaded successfully.", imageUrl = op.LogoUrl });
        }
        private static BusOperatorResponseDto ToResponseDto(BusOperator op) => new()
        {
            Id = op.Id,
            Name = op.Name,
            LegalName = op.LegalName,
            RegistrationNumber = op.RegistrationNumber,
            AddressLine = op.AddressLine,
            CreatedAtUtc = op.CreatedAtUtc,
            UpdatedAtUtc = op.UpdatedAtUtc,
            DeletedAtUtc = op.DeletedAtUtc,
            ContactPhone = op.ContactPhone,
            Email = op.Email,
            LogoUrl = op.LogoUrl,
            City = op.City,
            District = op.District,
            Country = op.Country,
            FoundedYear = op.FoundedYear,
            RegisteredOnUtc = op.RegisteredOnUtc,
            InventoryMode = op.InventoryMode,
            IsActive = op.IsActive,
            RowVersion = op.RowVersion,    //new add
            OperatorRoutes = op.OperatorRoutes
            .Select(r => new OperatorRouteResponseDto
            {
                Id = r.Id,
                BusRouteId = r.BusRouteId,
                OperatorRouteCode = r.OperatorRouteCode,
                DisplayName = r.DisplayName,
                InventoryModeOverride = r.InventoryModeOverride,
                IsActive = r.IsActive,

                // IMPORTANT
                RowVersion = r.RowVersion
            })
            .ToList()
        };

        // =========================================================
        // Auth helpers
        // =========================================================
        //
        // Operator-scoping (CanManageOperatorAsync) now lives in one place —
        // Extensions/ClaimsPrincipalExtensions.cs — used here and by every other controller
        // that needs it (Piece 2). This controller keeps only the one check that's genuinely
        // its own: "platform-only" for Create/Delete, where even an operator's own scoped staff
        // never qualifies.

        // "Platform-only" (Create/Delete) now lives on the shared extension
        // (ClaimsPrincipalExtensions.IsPlatformStaffOrAdminAsync), reused by the
        // ExternalMappings/IntegrationLogs controllers too. This used to be its own private
        // copy here that only checked IsInRole("Staff") — silently locking out the "Operator"
        // login role even for legitimate platform-wide staff accounts.
    }
}

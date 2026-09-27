using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Tests.Infrastructure;
using Xunit;

namespace TicketPortal.Api.Tests.Integration
{
    // RBAC Amendment v3's "required denied-case" table, sampled here for the controllers
    // already migrated to the Permissions catalogue (Buses, StaffProfiles). See
    // docs/RBAC_MIGRATION_GAP_REPORT.md and Architecture/NoBroadRoleChecksTests.cs for the
    // ~42 controllers this table does NOT yet cover — expanding this file to them is exactly
    // the kind of follow-up that gap report calls for. Ticket-check-in's own denied cases live
    // in Integration/TicketCheckInTests.cs rather than being duplicated here.
    [Collection(SharedApiCollection.Name)]
    public class AuthorizationDeniedCaseTests
    {
        private readonly TicketPortalWebApplicationFactory _factory;

        public AuthorizationDeniedCaseTests(TicketPortalWebApplicationFactory factory)
        {
            _factory = factory;
        }

        // A fully valid BusCreateDto — [ApiController] runs DataAnnotations validation (400)
        // BEFORE the action body's actor.HasPermission(...) check ever runs, so an incomplete
        // payload would give a false pass here (a 400 that looks like a security check working,
        // but actually never reached it). BusOperatorId doesn't need to point at a real row:
        // FleetManage is checked before the operator is even looked up.
        private static object ValidBusPayload() => new
        {
            BusOperatorId = Guid.NewGuid(),
            RegistrationNumber = $"TEST-{Guid.NewGuid():N}"[..12],
            CoachNumber = "TEST-COACH-1",
        };

        [Fact]
        public async Task CreateBus_AsCounterStaff_IsForbidden_NoFleetManagePermission()
        {
            var client = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.GreenLineCounterStaff, DemoAccounts.Password);

            var response = await client.PostAsJsonAsync("/api/buses", ValidBusPayload());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task CreateBus_AsCustomer_IsForbidden()
        {
            var client = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.Customer, DemoAccounts.Password);

            var response = await client.PostAsJsonAsync("/api/buses", ValidBusPayload());

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task CreateBus_Unauthenticated_IsUnauthorized_NotForbidden()
        {
            // No token at all must be a 401 (you haven't proven who you are), distinct from the
            // 403s above (we know who you are, and the answer is no).
            var anonymousClient = _factory.CreateClient();

            var response = await anonymousClient.PostAsJsonAsync("/api/buses", ValidBusPayload());

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task CreateBus_ForADifferentOperator_AsThatOperatorsOwnManager_IsForbidden()
        {
            // Green Line's Manager has FleetManage, but only within their own operator —
            // CanManageOperator must refuse a BusOperatorId belonging to a different operator
            // (Shohagh here), not just check the permission name in isolation.
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var greenLineOperatorId = await db.StaffProfiles
                .Where(sp => sp.User.UserName == DemoAccounts.GreenLineManager)
                .Select(sp => sp.BusOperatorId)
                .FirstAsync();
            var shohaghOperatorId = await db.StaffProfiles
                .Where(sp => sp.User.UserName == DemoAccounts.ShohaghSupervisor)
                .Select(sp => sp.BusOperatorId)
                .FirstAsync();

            Assert.NotEqual(greenLineOperatorId, shohaghOperatorId);

            var managerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.GreenLineManager, DemoAccounts.Password);
            var payloadForAnotherOperator = new
            {
                BusOperatorId = shohaghOperatorId,
                RegistrationNumber = $"TEST-{Guid.NewGuid():N}"[..12],
                CoachNumber = "TEST-COACH-2",
            };

            var response = await managerClient.PostAsJsonAsync("/api/buses", payloadForAnotherOperator);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Manager_CannotChangeTheirOwnStaffProfileRole_EvenThoughTheyHoldStaffManage()
        {
            // The RBAC amendment's flagship example (StaffProfilesController file header,
            // point 2): Staff.Manage is exactly the permission that would otherwise let its
            // holder edit any profile in their operator INCLUDING THEIR OWN — the self-promotion
            // guard has to be a separate, unconditional check, not something HasPermission alone
            // can express. Read the current row directly from the DB (arrange) rather than via
            // GetById, so this test doesn't also depend on that endpoint's exact response shape.
            Guid staffProfileId;
            byte[] rowVersion;
            string employeeCode;
            string? nationalId;
            DateOnly? joiningDate;
            string? address;
            int totalTrips;
            bool isActive;
            StaffRole currentRole;

            using (var scope = _factory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var profile = await db.StaffProfiles
                    .Include(sp => sp.User)
                    .SingleAsync(sp => sp.User.UserName == DemoAccounts.GreenLineManager);

                staffProfileId = profile.Id;
                rowVersion = profile.RowVersion;
                employeeCode = profile.EmployeeCode;
                nationalId = profile.NationalIdNumber;
                joiningDate = profile.JoiningDate;
                address = profile.Address;
                totalTrips = profile.TotalTripsCompleted;
                isActive = profile.IsActive;
                currentRole = profile.Role;
            }

            var managerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.GreenLineManager, DemoAccounts.Password);

            // Every field is echoed back unchanged EXCEPT Role — mirrors exactly what a client
            // that fetched via GET then submitted via PUT would send.
            var selfPromotionAttempt = new
            {
                EmployeeCode = employeeCode,
                Role = currentRole == StaffRole.Manager ? StaffRole.Operator : StaffRole.Manager,
                NationalIdNumber = nationalId,
                JoiningDate = joiningDate,
                Address = address,
                TotalTripsCompleted = totalTrips,
                IsActive = isActive,
                RowVersion = rowVersion,
            };

            var response = await managerClient.PutAsJsonAsync($"/api/staffprofiles/{staffProfileId}", selfPromotionAttempt);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            using var verifyScope = _factory.CreateScope();
            var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var stillUnchanged = await verifyDb.StaffProfiles.AsNoTracking().SingleAsync(sp => sp.Id == staffProfileId);
            Assert.Equal(currentRole, stillUnchanged.Role); // Untouched.
        }
    }
}

using System.Net;
using Microsoft.EntityFrameworkCore;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Tests.Infrastructure;
using Xunit;

namespace TicketPortal.Api.Tests.Integration
{
    // Chunk 10 "first tests": ticket check-in once. Exercises the real
    // POST /api/tickets/{ticketNumber}/check-in endpoint (TicketsController.CheckIn).
    [Collection(SharedApiCollection.Name)]
    public class TicketCheckInTests
    {
        private readonly TicketPortalWebApplicationFactory _factory;

        public TicketCheckInTests(TicketPortalWebApplicationFactory factory)
        {
            _factory = factory;
        }

        // Finds an Issued ticket belonging to the SAME operator as the given staff username's
        // StaffProfile — resolved from the DB rather than hardcoding an operator name, so this
        // keeps working if DemoDataSeeder's operator names/order ever change.
        private async Task<string> FindAnIssuedTicketForOperatorOfAsync(string staffUserName)
        {
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var operatorId = await db.StaffProfiles
                .Where(sp => sp.User.UserName == staffUserName)
                .Select(sp => sp.BusOperatorId)
                .FirstOrDefaultAsync();

            Assert.True(operatorId != null, $"Seeded staff account '{staffUserName}' has no BusOperatorId — has DemoDataSeeder changed?");

            var ticketNumber = await db.Tickets
                .Where(t => t.Status == TicketStatus.Issued)
                .Where(t => db.Bookings.Any(b => b.Id == t.BookingId && b.BusOperatorId == operatorId))
                .Select(t => t.TicketNumber)
                .FirstOrDefaultAsync();

            Assert.True(!string.IsNullOrEmpty(ticketNumber),
                $"No Issued ticket found for operator {operatorId} in seeded demo data — DemoDataSeeder may have changed.");

            return ticketNumber!;
        }

        private static Task<HttpResponseMessage> CheckInAsync(HttpClient client, string ticketNumber) =>
            client.PostAsync($"/api/tickets/{ticketNumber}/check-in", new StringContent(string.Empty));

        [Fact]
        public async Task Supervisor_CanCheckInAnIssuedTicket_AndASecondScanIsIdempotent_NotAnError()
        {
            var ticketNumber = await FindAnIssuedTicketForOperatorOfAsync(DemoAccounts.ShohaghSupervisor);
            var supervisorClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.ShohaghSupervisor, DemoAccounts.Password);

            var firstScan = await CheckInAsync(supervisorClient, ticketNumber);
            Assert.Equal(HttpStatusCode.OK, firstScan.StatusCode);

            using (var scope = _factory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var ticket = await db.Tickets.AsNoTracking().SingleAsync(t => t.TicketNumber == ticketNumber);
                Assert.Equal(TicketStatus.CheckedIn, ticket.Status);
                Assert.NotNull(ticket.CheckedInAtUtc);
            }

            // Chunk 4 task 1/5: a second scan of an already-checked-in ticket is a normal
            // boarding-desk event, not an error — must stay 200, not 400/409.
            var secondScan = await CheckInAsync(supervisorClient, ticketNumber);
            Assert.Equal(HttpStatusCode.OK, secondScan.StatusCode);

            var secondBody = await secondScan.Content.ReadAsStringAsync();
            Assert.Contains("true", secondBody, StringComparison.OrdinalIgnoreCase); // alreadyCheckedIn: true
        }

        [Fact]
        public async Task CounterStaff_CannotCheckInATicket_LacksTicketCheckInPermission()
        {
            // StaffRole.CounterStaff's permission set (PermissionMatrix.OperatorScope) is
            // CounterRead/CounterSell/CounterCancel/BookingRead — no Ticket.CheckIn. Must be
            // denied before the controller even looks at which ticket/operator was named.
            var ticketNumber = await FindAnIssuedTicketForOperatorOfAsync(DemoAccounts.ShohaghCounterStaff);
            var counterStaffClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.ShohaghCounterStaff, DemoAccounts.Password);

            var response = await CheckInAsync(counterStaffClient, ticketNumber);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ticket = await db.Tickets.AsNoTracking().SingleAsync(t => t.TicketNumber == ticketNumber);
            Assert.Equal(TicketStatus.Issued, ticket.Status); // Untouched.
        }

        [Fact]
        public async Task Customer_CannotCheckInATicket()
        {
            var ticketNumber = await FindAnIssuedTicketForOperatorOfAsync(DemoAccounts.ShohaghSupervisor);
            var customerClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.Customer, DemoAccounts.Password);

            var response = await CheckInAsync(customerClient, ticketNumber);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task UnauthenticatedRequest_CannotCheckInATicket()
        {
            var ticketNumber = await FindAnIssuedTicketForOperatorOfAsync(DemoAccounts.ShohaghSupervisor);
            var anonymousClient = _factory.CreateClient();

            var response = await CheckInAsync(anonymousClient, ticketNumber);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Supervisor_FromADifferentOperator_CannotCheckInThisOperatorsTicket()
        {
            // delwar.supervisor.sho HAS Ticket.CheckIn, but only within their own operator
            // (Shohagh) — CanManageOperator must still refuse a ticket belonging to a
            // different operator's booking (e.g. Green Line).
            using var scope = _factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var shohaghOperatorId = await db.StaffProfiles
                .Where(sp => sp.User.UserName == DemoAccounts.ShohaghSupervisor)
                .Select(sp => sp.BusOperatorId)
                .FirstAsync();

            var ticketFromAnotherOperator = await db.Tickets
                .Where(t => t.Status == TicketStatus.Issued)
                .Where(t => db.Bookings.Any(b => b.Id == t.BookingId && b.BusOperatorId != shohaghOperatorId))
                .Select(t => t.TicketNumber)
                .FirstOrDefaultAsync();

            Assert.True(!string.IsNullOrEmpty(ticketFromAnotherOperator),
                "Expected at least one Issued ticket belonging to an operator other than Shohagh in seeded demo data.");

            var supervisorClient = await _factory.CreateAuthenticatedClientAsync(DemoAccounts.ShohaghSupervisor, DemoAccounts.Password);
            var response = await CheckInAsync(supervisorClient, ticketFromAnotherOperator!);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}

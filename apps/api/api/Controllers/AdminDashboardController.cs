using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
    // Completion Plan v2, Chunk 9 ("Admin: server-side dashboard & reports"). A new file, not
    // an addition to AdminController.cs, on purpose — AdminController is Piece 1's
    // identity/role-provisioning surface (GetUsers/AssignRole/CreateStaff); this is a separate
    // read-only reporting surface, and keeping them apart avoids two unrelated features
    // colliding on the same file in code review.
    //
    // Everything below is Admin-only, same lightweight `User.IsInRole("Admin")` check
    // AdminController itself uses — there's no CurrentActor/Permissions entry for this because
    // the plan is explicit that this dashboard is platform-wide financial + operational data
    // no non-Admin persona (not even Platform Manager/Finance, who hold Reports.Read/
    // Finance.ReadPlatform for their OWN narrower screens) should see in one place. See
    // RBAC Amendment v3, "Chunk 9" weight/scope note.
    //
    // Every figure here is computed by a real SQL aggregate query (GroupBy/Sum/Count executed
    // by EF Core against the database), never by pulling full tables into memory and reducing
    // them in C#/JS — that was exactly the gap in the old console/pages/admin/Dashboard.tsx
    // (see its own removed comment) this chunk replaces. The money figures reuse the exact
    // same PlatformLedger ItemType/SaleChannel buckets SettlementGenerationService uses to
    // build a real settlement, so a number on this dashboard for a given period always agrees
    // with a hand-checked settlement for that same period — see ADMIN_DASHBOARD_DATA_MAP.md.
    [Authorize]
    [Route("api/admin/dashboard")]
    [ApiController]
    public class AdminDashboardController(AppDbContext db) : ControllerBase
    {
        // How many days of daily-series points to build at most, even if the caller passes an
        // enormous from/to range — this endpoint answers "give me a dashboard for a demo
        // period", not "reconstruct the platform's entire history day by day".
        private const int MaxDailySeriesDays = 366;

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] Guid? operatorId)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var range = ResolveRange(from, to);
            if (range == null)
            {
                return BadRequest(new { message = "'to' cannot be before 'from'." });
            }
            var (fromDate, toDate, fromUtc, toExclusiveUtc) = range.Value;

            if (operatorId.HasValue && !await db.BusOperators.AnyAsync(o => o.Id == operatorId.Value))
            {
                return BadRequest(new { message = "operatorId does not match a real BusOperator." });
            }

            var bookingsInRange = db.Bookings.Where(b =>
                b.CreatedAtUtc >= fromUtc && b.CreatedAtUtc < toExclusiveUtc
                && (operatorId == null || b.BusOperatorId == operatorId));

            var ledgerInRange = db.PlatformLedgers.Where(l =>
                l.CreatedAtUtc >= fromUtc && l.CreatedAtUtc < toExclusiveUtc
                && (operatorId == null || l.BusOperatorId == operatorId));

            var ticketsInRange = db.Tickets.Where(t =>
                t.Booking.CreatedAtUtc >= fromUtc && t.Booking.CreatedAtUtc < toExclusiveUtc
                && (operatorId == null || t.Booking.BusOperatorId == operatorId)
                && t.Status != TicketStatus.Cancelled && t.Status != TicketStatus.Refunded);

            var operatorsByMode = await db.BusOperators
                .Where(o => operatorId == null || o.Id == operatorId)
                .GroupBy(o => o.InventoryMode)
                .Select(g => new OperatorModeCountDto { Mode = g.Key, OperatorCount = g.Count() })
                .OrderBy(x => x.Mode)
                .ToListAsync();

            var bookingsByChannelStatus = await bookingsInRange
                .GroupBy(b => new { b.SaleChannel, b.Status })
                .Select(g => new BookingChannelStatusDto
                {
                    SaleChannel = g.Key.SaleChannel,
                    Status = g.Key.Status,
                    Count = g.Count(),
                    GrandTotalSum = g.Sum(b => b.GrandTotal),
                })
                .OrderBy(x => x.SaleChannel).ThenBy(x => x.Status)
                .ToListAsync();

            var onlineGross = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.OnlineTicketSale)
                .SumAsync(l => l.CreditAmount);
            var onlineBookingCount = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.OnlineTicketSale)
                .Select(l => l.BookingId)
                .Distinct()
                .CountAsync();
            var onlineCommission = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.PlatformCommission)
                .SumAsync(l => l.DebitAmount);
            var counterCommission = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.CounterSaleCommission)
                .SumAsync(l => l.DebitAmount);
            var onlineRefund = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.Refund && l.SaleChannel == SaleChannel.Online)
                .SumAsync(l => l.DebitAmount);
            var counterRefundReversal = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.Refund && l.SaleChannel == SaleChannel.Counter)
                .SumAsync(l => l.CreditAmount);
            var refundCount = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.Refund)
                .Select(l => l.RefundId)
                .Distinct()
                .CountAsync();
            var counterTicketCount = await ticketsInRange
                .Where(t => t.Booking.SaleChannel == SaleChannel.Counter)
                .CountAsync();

            var settlementsByStatus = await db.OperatorSettlements
                .Where(s => s.CreatedAtUtc >= fromUtc && s.CreatedAtUtc < toExclusiveUtc
                    && (operatorId == null || s.BusOperatorId == operatorId))
                .GroupBy(s => new { s.Status, s.Direction })
                .Select(g => new SettlementStatusBucketDto
                {
                    Status = g.Key.Status,
                    Direction = g.Key.Direction,
                    Count = g.Count(),
                    NetAmountSum = g.Sum(s => s.NetAmount),
                })
                .OrderBy(x => x.Status).ThenBy(x => x.Direction)
                .ToListAsync();

            var payoutsByStatus = await db.OperatorPayouts
                .Where(p => p.CreatedAtUtc >= fromUtc && p.CreatedAtUtc < toExclusiveUtc
                    && (operatorId == null || p.BusOperatorId == operatorId))
                .GroupBy(p => p.Status)
                .Select(g => new PayoutStatusBucketDto
                {
                    Status = g.Key,
                    Count = g.Count(),
                    AmountSum = g.Sum(p => p.Amount),
                })
                .OrderBy(x => x.Status)
                .ToListAsync();

            // --- Operational alerts: current state, not the date range above (see the DTO's
            // own field comments for why) ---
            var pendingCancellations = await db.CancellationRequests
                .Where(c => c.Status == CancellationRequestStatus.Requested)
                .Where(c => operatorId == null || c.Booking.BusOperatorId == operatorId)
                .CountAsync();

            var pendingRefunds = await db.Refunds
                .Where(r => r.Status == RefundStatus.Requested
                    || r.Status == RefundStatus.Approved
                    || r.Status == RefundStatus.Processing
                    || r.Status == RefundStatus.PendingManualPayout
                    || r.Status == RefundStatus.ReconciliationNeeded)
                .Where(r => operatorId == null || r.Booking.BusOperatorId == operatorId)
                .CountAsync();

            var openComplaints = await db.Complaints
                .Where(c => c.Status == ComplaintStatus.Open || c.Status == ComplaintStatus.InProgress)
                .Where(c => operatorId == null || (c.Booking != null && c.Booking.BusOperatorId == operatorId))
                .CountAsync();

            var utcNow = DateTime.UtcNow;
            var activeSeatHolds = await db.SeatHolds
                .Where(h => h.Status == SeatHoldStatus.Active && h.HoldExpiresAtUtc > utcNow)
                .Where(h => operatorId == null || h.Trip.BusOperatorId == operatorId)
                .CountAsync();

            var failureCutoff = utcNow.AddHours(-24);
            var integrationFailuresLast24h = await db.IntegrationSyncLogs
                .Where(l => l.Status == IntegrationSyncStatus.Failed && l.StartedAtUtc >= failureCutoff)
                .Where(l => operatorId == null || l.OperatorIntegration.BusOperatorId == operatorId)
                .CountAsync();

            var paymentsNeedingReconciliation = await db.PaymentHistories
                .Where(h => h.Status == PaymentStatus.ReconciliationNeeded)
                .Where(h => operatorId == null || h.Payment.Booking.BusOperatorId == operatorId)
                .Select(h => h.PaymentId)
                .Distinct()
                .CountAsync();

            var bookingsAwaitingExternalConfirmation = await db.Bookings
                .Where(b => b.RequiresExternalConfirmation && b.ExternalConfirmedAtUtc == null
                    && b.Status != BookingStatus.Cancelled
                    && b.Status != BookingStatus.Failed
                    && b.Status != BookingStatus.Expired)
                .Where(b => operatorId == null || b.BusOperatorId == operatorId)
                .CountAsync();

            var dailySeries = await BuildDailySeriesAsync(fromDate, toDate, fromUtc, toExclusiveUtc, operatorId);

            return Ok(new AdminDashboardSummaryDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                OperatorId = operatorId,
                OperatorsByInventoryMode = operatorsByMode,
                BookingsByChannelAndStatus = bookingsByChannelStatus,
                OnlineGrossAmount = onlineGross,
                OnlineBookingCount = onlineBookingCount,
                CounterTicketCount = counterTicketCount,
                OnlineCommissionEarned = onlineCommission,
                CounterCommissionEarned = counterCommission,
                OnlineRefundAmount = onlineRefund,
                CounterCommissionReversedAmount = counterRefundReversal,
                RefundCount = refundCount,
                SettlementsByStatus = settlementsByStatus,
                PayoutsByStatus = payoutsByStatus,
                PendingCancellationRequests = pendingCancellations,
                PendingRefunds = pendingRefunds,
                OpenComplaints = openComplaints,
                ActiveSeatHolds = activeSeatHolds,
                IntegrationFailuresLast24h = integrationFailuresLast24h,
                PaymentsNeedingReconciliation = paymentsNeedingReconciliation,
                BookingsAwaitingExternalConfirmation = bookingsAwaitingExternalConfirmation,
                DailySeries = dailySeries,
            });
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReports(
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] Guid? operatorId)
        {
            if (!User.IsInRole("Admin")) return Forbid();

            var range = ResolveRange(from, to);
            if (range == null)
            {
                return BadRequest(new { message = "'to' cannot be before 'from'." });
            }
            var (fromDate, toDate, fromUtc, toExclusiveUtc) = range.Value;

            if (operatorId.HasValue && !await db.BusOperators.AnyAsync(o => o.Id == operatorId.Value))
            {
                return BadRequest(new { message = "operatorId does not match a real BusOperator." });
            }

            var ledgerInRange = db.PlatformLedgers.Where(l =>
                l.CreatedAtUtc >= fromUtc && l.CreatedAtUtc < toExclusiveUtc
                && l.BusOperatorId != null
                && (operatorId == null || l.BusOperatorId == operatorId));

            var operators = await db.BusOperators
                .Where(o => operatorId == null || o.Id == operatorId)
                .Select(o => new { o.Id, o.Name, o.InventoryMode })
                .ToListAsync();

            // Pulled once, grouped by (operator, item type, channel) in SQL, then combined into
            // per-operator rows in memory — the same "aggregate in the database, shape in C#"
            // split used throughout this controller (see the class comment).
            var ledgerBuckets = await ledgerInRange
                .GroupBy(l => new { l.BusOperatorId, l.ItemType, l.SaleChannel })
                .Select(g => new
                {
                    g.Key.BusOperatorId,
                    g.Key.ItemType,
                    g.Key.SaleChannel,
                    DebitSum = g.Sum(x => x.DebitAmount),
                    CreditSum = g.Sum(x => x.CreditAmount),
                })
                .ToListAsync();

            var onlineBookingsByOperator = await ledgerInRange
                .Where(l => l.ItemType == StatementItemType.OnlineTicketSale)
                .Select(l => new { l.BusOperatorId, l.BookingId })
                .Distinct()
                .ToListAsync();

            var counterTicketsByOperator = await db.Tickets
                .Where(t => t.Booking.SaleChannel == SaleChannel.Counter
                    && t.Booking.CreatedAtUtc >= fromUtc && t.Booking.CreatedAtUtc < toExclusiveUtc
                    && (operatorId == null || t.Booking.BusOperatorId == operatorId)
                    && t.Status != TicketStatus.Cancelled && t.Status != TicketStatus.Refunded)
                .GroupBy(t => t.Booking.BusOperatorId)
                .Select(g => new { BusOperatorId = (Guid?)g.Key, Count = g.Count() })
                .ToListAsync();

            var salesByOperator = new List<OperatorSalesReportRowDto>();
            foreach (var op in operators)
            {
                var rows = ledgerBuckets.Where(x => x.BusOperatorId == op.Id).ToList();

                var onlineGross = rows.Where(x => x.ItemType == StatementItemType.OnlineTicketSale).Sum(x => x.CreditSum);
                var onlineCommission = rows.Where(x => x.ItemType == StatementItemType.PlatformCommission).Sum(x => x.DebitSum);
                var counterCommission = rows.Where(x => x.ItemType == StatementItemType.CounterSaleCommission).Sum(x => x.DebitSum);
                var onlineRefund = rows.Where(x => x.ItemType == StatementItemType.Refund && x.SaleChannel == SaleChannel.Online).Sum(x => x.DebitSum);
                var counterRefundReversal = rows.Where(x => x.ItemType == StatementItemType.Refund && x.SaleChannel == SaleChannel.Counter).Sum(x => x.CreditSum);
                var netAmount = rows.Sum(x => x.CreditSum - x.DebitSum);

                salesByOperator.Add(new OperatorSalesReportRowDto
                {
                    BusOperatorId = op.Id,
                    BusOperatorName = op.Name,
                    InventoryMode = op.InventoryMode,
                    OnlineGrossAmount = onlineGross,
                    OnlineBookingCount = onlineBookingsByOperator.Count(x => x.BusOperatorId == op.Id),
                    OnlineCommissionEarned = onlineCommission,
                    CounterTicketCount = counterTicketsByOperator.FirstOrDefault(x => x.BusOperatorId == op.Id)?.Count ?? 0,
                    CounterCommissionEarned = counterCommission,
                    RefundAmount = onlineRefund + counterRefundReversal,
                    NetAmount = netAmount,
                });
            }
            salesByOperator = salesByOperator
                .OrderByDescending(x => x.OnlineGrossAmount + x.CounterCommissionEarned)
                .ToList();

            var onlineVsCounter = new OnlineVsCounterSummaryDto
            {
                OnlineBookingCount = onlineBookingsByOperator.Select(x => x.BookingId).Distinct().Count(),
                OnlineGrossAmount = ledgerBuckets.Where(x => x.ItemType == StatementItemType.OnlineTicketSale).Sum(x => x.CreditSum),
                OnlineCommissionEarned = ledgerBuckets.Where(x => x.ItemType == StatementItemType.PlatformCommission).Sum(x => x.DebitSum),
                CounterTicketCount = counterTicketsByOperator.Sum(x => x.Count),
                CounterCommissionEarned = ledgerBuckets.Where(x => x.ItemType == StatementItemType.CounterSaleCommission).Sum(x => x.DebitSum),
            };

            var settlements = await db.OperatorSettlements
                .Where(s => s.CreatedAtUtc >= fromUtc && s.CreatedAtUtc < toExclusiveUtc
                    && (operatorId == null || s.BusOperatorId == operatorId))
                .OrderByDescending(s => s.CreatedAtUtc)
                .Select(s => new SettlementReportRowDto
                {
                    Id = s.Id,
                    SettlementNo = s.SettlementNo,
                    BusOperatorId = s.BusOperatorId,
                    BusOperatorName = s.BusOperator.Name,
                    FromDate = s.FromDate,
                    ToDate = s.ToDate,
                    Direction = s.Direction,
                    Status = s.Status,
                    OnlineGrossAmount = s.OnlineGrossAmount,
                    PlatformCharge = s.PlatformCharge,
                    RefundAmount = s.RefundAmount,
                    NetAmount = s.NetAmount,
                })
                .ToListAsync();

            return Ok(new AdminDashboardReportsDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                OperatorId = operatorId,
                SalesByOperator = salesByOperator,
                OnlineVsCounter = onlineVsCounter,
                Settlements = settlements,
            });
        }

        // Same "DateOnly range -> [fromUtc, toExclusiveUtc)" convention as
        // SettlementGenerationService.GenerateSettlementAsync, so a dashboard figure and a real
        // settlement for the same calendar dates are always reading the exact same ledger rows.
        // Defaults to the trailing 30 days (today inclusive) when the caller passes neither
        // bound, which is a reasonable "what's been happening lately" default for a landing
        // dashboard without forcing every caller to compute one.
        private static (DateOnly fromDate, DateOnly toDate, DateTime fromUtc, DateTime toExclusiveUtc)? ResolveRange(
            DateOnly? from, DateOnly? to)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var toDate = to ?? today;
            var fromDate = from ?? toDate.AddDays(-29);

            if (toDate < fromDate) return null;

            var fromUtc = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var toExclusiveUtc = toDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            return (fromDate, toDate, fromUtc, toExclusiveUtc);
        }

        // Deliberately narrow projections (just the columns each series actually needs) pulled
        // once each, filtered/scoped in SQL, then bucketed by calendar day in memory — grouping
        // an already-small, already-filtered result set day-by-day in C# is simpler and safer
        // than relying on a provider-specific SQL date-truncation translation, at exam-project
        // data volumes. Capped at MaxDailySeriesDays so an unusually wide from/to range can't
        // turn this into an unbounded day-by-day loop.
        private async Task<List<DailyChannelPointDto>> BuildDailySeriesAsync(
            DateOnly fromDate, DateOnly toDate, DateTime fromUtc, DateTime toExclusiveUtc, Guid? operatorId)
        {
            var cappedToDate = toDate;
            if (toDate.DayNumber - fromDate.DayNumber + 1 > MaxDailySeriesDays)
            {
                cappedToDate = fromDate.AddDays(MaxDailySeriesDays - 1);
                var cappedToExclusiveUtc = cappedToDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                toExclusiveUtc = cappedToExclusiveUtc;
            }

            var onlineRows = await db.PlatformLedgers
                .Where(l => l.CreatedAtUtc >= fromUtc && l.CreatedAtUtc < toExclusiveUtc
                    && l.ItemType == StatementItemType.OnlineTicketSale
                    && (operatorId == null || l.BusOperatorId == operatorId))
                .Select(l => new { l.CreatedAtUtc, l.CreditAmount, l.BookingId })
                .ToListAsync();

            var counterTicketDates = await db.Tickets
                .Where(t => t.Booking.SaleChannel == SaleChannel.Counter
                    && t.Booking.CreatedAtUtc >= fromUtc && t.Booking.CreatedAtUtc < toExclusiveUtc
                    && (operatorId == null || t.Booking.BusOperatorId == operatorId)
                    && t.Status != TicketStatus.Cancelled && t.Status != TicketStatus.Refunded)
                .Select(t => t.Booking.CreatedAtUtc)
                .ToListAsync();

            var points = new List<DailyChannelPointDto>();
            for (var day = fromDate; day <= cappedToDate; day = day.AddDays(1))
            {
                var dayOnlineRows = onlineRows.Where(l => DateOnly.FromDateTime(l.CreatedAtUtc) == day).ToList();
                var dayCounterCount = counterTicketDates.Count(d => DateOnly.FromDateTime(d) == day);

                points.Add(new DailyChannelPointDto
                {
                    Date = day,
                    OnlineGrossAmount = dayOnlineRows.Sum(l => l.CreditAmount),
                    OnlineBookingCount = dayOnlineRows.Select(l => l.BookingId).Distinct().Count(),
                    CounterTicketCount = dayCounterCount,
                });
            }
            return points;
        }
    }
}

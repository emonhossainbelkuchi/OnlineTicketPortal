using System.Collections.Concurrent;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Bookings;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Models.Integrations;
using TicketPortal.Api.Models.Payments;
using TicketPortal.Api.Models.Scheduling;

namespace TicketPortal.Api.Services
{
    // Piece 7 / Chunk 8 (concept doc §3.2): the actual "call the operator's API to sync and
    // check booking status" half of the API-connected integration model. See
    // docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md for the full request/response contract this
    // engine speaks, and apps/mock-erp for a small local server that implements it — point a
    // demo/dev OperatorIntegration.BaseUrl at that (see Data/DemoDataSeeder.cs's Hanif rows) and
    // this engine has something real to talk to for the first time.
    //
    // Four call types now exist (Chunk 8), each keyed off OperatorIntegrationEndpoint.Purpose
    // (case-insensitive), same convention as the original ConfirmBooking-only version:
    //   - ConfirmBooking        — SyncOneAsync, driven by the sweep (ExternalBookingSyncSweepService)
    //   - GetSeatAvailability   — CheckSeatAvailabilityAsync, called synchronously from
    //                             SeatHoldsController before every hold on an ExternalApiManaged trip
    //   - CancelBooking         — TryCancelExternalBookingAsync, best-effort propagation from
    //                             CancellationProcessingService
    //   - GetBookingStatus      — documented in the contract and seeded for completeness, but no
    //                             caller in this project yet; a natural place to add a manual
    //                             "check status now" admin action later.
    //
    // Rejection/timeout policy (Chunk 8 task 4): a booking must never sit "Confirmed" forever on
    // the strength of an operator reply we never actually got. Three ways a booking gets
    // rejected here, all converging on RejectConfirmedBookingAsync:
    //   1. The operator API returns 409 Conflict — treated as an immediate, explicit rejection.
    //   2. A 2xx reply's parsed Status is one of RejectionStatusValues (e.g. "Rejected",
    //      "Failed") — also immediate.
    //   3. Any other failure (5xx, malformed reply, network error, timeout) increments a
    //      per-booking failure count; once that count reaches Integrations:MaxSyncAttempts
    //      (default 5 — see ApplyTimeoutPolicyAsync), it's escalated to a rejection too, so a
    //      permanently unreachable ERP can't leave a booking "confirmed" forever either.
    // RejectConfirmedBookingAsync reuses the same shape as PaymentConfirmationService's
    // paid-but-seats-lost path and CancellationProcessingService.ApproveAsync: cancel the
    // tickets, release the seats through SeatHoldService (still the only class allowed to touch
    // TripSeat.Status), mark the booking Failed, and create an automatic Refund at Requested —
    // RefundProcessingService is still the only thing that ever advances a Refund from there.
    //
    // Registered via builder.Services.AddHttpClient<ExternalBookingSyncService>() in Program.cs —
    // the standard ASP.NET "typed client" pattern, so HttpClient arrives already pooled/managed
    // by IHttpClientFactory instead of this class newing one up itself. That registration also
    // makes this service injectable directly wherever it's needed (SeatHoldsController,
    // OperatorIntegrationsController, CancellationProcessingService), not just from the sweep.
    public class ExternalBookingSyncService
    {
        private const string ConfirmBookingPurpose = "ConfirmBooking";
        private const string GetSeatAvailabilityPurpose = "GetSeatAvailability";
        private const string CancelBookingPurpose = "CancelBooking";
        private const string TestConnectionOperation = "TestConnection";

        // Raw operator-reply status strings that mean "definitely no" — deliberately NOT limited
        // to exact TicketPortal.Api.Models.Enums.BookingStatus member names (an operator's ERP
        // has no reason to use our internal enum's exact spelling), so this is checked as plain
        // string comparison, separate from the BookingStatus.TryParse done in ApplyResultAsync
        // for the informational LastKnownExternalStatus mapping field.
        private static readonly string[] RejectionStatusValues =
        {
            "Failed", "Rejected", "Declined", "Cancelled", "Canceled", "SeatUnavailable"
        };

        private const int DefaultMaxConfirmAttempts = 5;

        private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

        // GetSeatAvailability is called on every seat-hold attempt for an ExternalApiManaged
        // trip (see SeatHoldsController), so a short in-memory cache keeps a busy search/checkout
        // page from hammering the operator's ERP on every click. Deliberately static (this
        // service itself is scoped-per-request/per-typed-client-call, so an instance field would
        // reset every time) and keyed by TripId. Same tradeoff as any other in-process cache: a
        // multi-instance deployment would see up to AvailabilityCacheTtl of staleness per
        // instance, which is acceptable here since the hold itself is still re-validated against
        // TripSeat.Status at the database level regardless (see SeatHoldService).
        private static readonly ConcurrentDictionary<Guid, CachedAvailability> AvailabilityCache = new();
        private static readonly TimeSpan AvailabilityCacheTtl = TimeSpan.FromSeconds(30);
        private static readonly TimeSpan AvailabilityCheckTimeout = TimeSpan.FromSeconds(5);

        private readonly AppDbContext _db;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly SeatHoldService _seatHoldService;
        private readonly ILogger<ExternalBookingSyncService> _logger;

        public ExternalBookingSyncService(
            AppDbContext db,
            HttpClient httpClient,
            IConfiguration configuration,
            SeatHoldService seatHoldService,
            ILogger<ExternalBookingSyncService> logger)
        {
            _db = db;
            _httpClient = httpClient;
            _configuration = configuration;
            _seatHoldService = seatHoldService;
            _logger = logger;
        }

        // Finds every Booking still waiting on an operator's confirmation and attempts one sync
        // call each. Returns how many it attempted (not how many succeeded — check
        // IntegrationSyncLog.Status for that), so the sweep can log a useful count either way.
        public async Task<int> SyncPendingBookingsAsync(CancellationToken ct = default)
        {
            var pendingBookings = await _db.Bookings
                .Include(b => b.TripSeats)
                .Where(b => b.RequiresExternalConfirmation
                    && b.ExternalConfirmedAtUtc == null
                    && b.Status != BookingStatus.Cancelled
                    && b.Status != BookingStatus.Expired
                    && b.Status != BookingStatus.Failed)
                .ToListAsync(ct);

            foreach (var booking in pendingBookings)
            {
                await SyncOneAsync(booking, ct);
            }

            return pendingBookings.Count;
        }

        private async Task SyncOneAsync(Booking booking, CancellationToken ct)
        {
            var integration = await _db.OperatorIntegrations
                .Include(i => i.Endpoints)
                .Where(i => i.BusOperatorId == booking.BusOperatorId && i.IsActive)
                .FirstOrDefaultAsync(ct);

            // No OperatorIntegration configured for this operator at all — IntegrationSyncLog's
            // OperatorIntegrationId is a required FK (see IntegrationSyncLog/IntegrationWebhookLog:
            // both carry a non-nullable OperatorIntegration navigation), so there's no valid row
            // to attach a log to yet. Nothing to call and nothing safe to log — just skip quietly;
            // this stops being silent the moment someone adds an OperatorIntegration row for this
            // BusOperator, which is the actual fix for "nothing happens."
            if (integration == null)
            {
                return;
            }

            var endpoint = integration.Endpoints
                .FirstOrDefault(e => e.IsActive
                    && string.Equals(e.Purpose, ConfirmBookingPurpose, StringComparison.OrdinalIgnoreCase));

            // An integration row exists but has no ConfirmBooking endpoint configured yet — this
            // DOES have a valid OperatorIntegrationId to log against, so record it as Skipped
            // instead of silently doing nothing every sweep with no trace anywhere.
            if (endpoint == null)
            {
                _db.IntegrationSyncLogs.Add(new IntegrationSyncLog
                {
                    OperatorIntegrationId = integration.Id,
                    EntityName = "Booking",
                    EntityKey = booking.Id.ToString(),
                    Operation = ConfirmBookingPurpose,
                    Status = IntegrationSyncStatus.Skipped,
                    StartedAtUtc = DateTime.UtcNow,
                    CompletedAtUtc = DateTime.UtcNow,
                    ErrorMessage = "OperatorIntegration has no active endpoint with Purpose 'ConfirmBooking'."
                });

                await _db.SaveChangesAsync(ct);
                return;
            }

            var log = new IntegrationSyncLog
            {
                OperatorIntegrationId = integration.Id,
                EntityName = "Booking",
                EntityKey = booking.Id.ToString(),
                Operation = ConfirmBookingPurpose,
                Status = IntegrationSyncStatus.Pending,
                StartedAtUtc = DateTime.UtcNow
            };

            try
            {
                var requestBody = new
                {
                    bookingId = booking.Id,
                    pnr = booking.Pnr,
                    tripId = booking.TripId,
                    seatCount = booking.TripSeats.Count,
                    seatNumbers = booking.TripSeats.Select(s => s.SeatNumber).ToArray(),
                    grandTotal = booking.GrandTotal,
                    currency = booking.Currency
                };

                var requestJson = JsonSerializer.Serialize(requestBody);
                log.RequestJson = requestJson;

                // BaseUrl is expected to be just the operator's host/origin (e.g.
                // "https://operator.example.com"), with PathTemplate supplying the rest,
                // always starting with "/" — plain string concatenation instead of the
                // built-in Uri(baseUri, relativeUri) combine, which silently drops BaseUrl's
                // own path segment whenever the relative part starts with "/".
                var path = endpoint.PathTemplate.Replace("{bookingId}", booking.Id.ToString());
                var requestUri = new Uri(integration.BaseUrl.TrimEnd('/') + (path.StartsWith('/') ? path : "/" + path));

                using var request = new HttpRequestMessage(new HttpMethod(endpoint.HttpMethod), requestUri)
                {
                    Content = new StringContent(requestJson, Encoding.UTF8, "application/json")
                };

                ApplyAuth(request, integration);

                // Per-call timeout via a linked CancellationTokenSource, NOT _httpClient.Timeout —
                // this same _httpClient instance is reused across every booking in one sweep tick
                // (see SyncPendingBookingsAsync's loop), and HttpClient.Timeout can only be set
                // BEFORE the first request is ever sent on an instance; setting it again on the
                // second booking's call throws InvalidOperationException. TimeoutSeconds also
                // varies per operator, so a single fixed client-level timeout wouldn't fit anyway.
                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(integration.TimeoutSeconds));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

                using var response = await _httpClient.SendAsync(request, linkedCts.Token);
                var responseJson = await response.Content.ReadAsStringAsync(ct);
                log.ResponseJson = responseJson;

                if (response.StatusCode == HttpStatusCode.Conflict)
                {
                    // 409 is this contract's way of saying "no, definitively" (e.g. the seat was
                    // sold through the operator's own counter in the meantime) — an immediate
                    // rejection, not a transient failure worth retrying.
                    log.Status = IntegrationSyncStatus.Failed;
                    log.ErrorMessage = "Operator API rejected the booking (409 Conflict) — seat no longer available on their side.";
                    await RejectConfirmedBookingAsync(booking, log.ErrorMessage, ct);
                }
                else if (!response.IsSuccessStatusCode)
                {
                    log.Status = IntegrationSyncStatus.Failed;
                    log.ErrorMessage = $"Operator API returned {(int)response.StatusCode} {response.StatusCode}.";
                    await ApplyTimeoutPolicyAsync(booking, integration, ct);
                }
                else
                {
                    var parsed = JsonSerializer.Deserialize<ConfirmBookingResponse>(responseJson, JsonOpts);

                    // Always record whatever the operator sent back (ExternalBookingKey/Pnr,
                    // LastKnownExternalStatus) before deciding whether it amounts to a rejection
                    // — even a rejected attempt is useful audit trail on the mapping row.
                    await ApplyResultAsync(booking, integration, parsed, ct);

                    var isExplicitRejection = parsed != null
                        && parsed.Status != null
                        && RejectionStatusValues.Contains(parsed.Status, StringComparer.OrdinalIgnoreCase);

                    if (isExplicitRejection)
                    {
                        log.Status = IntegrationSyncStatus.Failed;
                        log.ErrorMessage = $"Operator ERP explicitly returned status '{parsed!.Status}'.";
                        await RejectConfirmedBookingAsync(booking, log.ErrorMessage, ct);
                    }
                    else
                    {
                        log.Status = IntegrationSyncStatus.Succeeded;
                        integration.LastSuccessfulSyncAtUtc = DateTime.UtcNow;
                    }
                }
            }
            catch (Exception ex)
            {
                // Network error, DNS failure, timeout, malformed JSON reply, etc. — all funnel
                // into the same "this attempt failed" path, which ApplyTimeoutPolicyAsync counts
                // toward Integrations:MaxSyncAttempts. One misconfigured or unreachable operator
                // integration can never take down the whole sweep either way — see
                // ExternalBookingSyncSweepService, which sweeps every pending booking in one run.
                log.Status = IntegrationSyncStatus.Failed;
                log.ErrorMessage = ex.Message;

                _logger.LogWarning(ex,
                    "External booking sync failed for Booking {BookingId} via OperatorIntegration {IntegrationId}.",
                    booking.Id, integration.Id);

                await ApplyTimeoutPolicyAsync(booking, integration, ct);
            }
            finally
            {
                log.CompletedAtUtc = DateTime.UtcNow;
                _db.IntegrationSyncLogs.Add(log);
                await _db.SaveChangesAsync(ct);
            }
        }

        // Chunk 8 task 4's timeout half: once a booking has racked up MaxSyncAttempts failed
        // ConfirmBooking attempts (this one included — its own log row hasn't been saved yet at
        // the point this runs, hence "+1" below), a permanently unreachable or misbehaving ERP
        // stops getting an infinite number of retries and is treated the same as an explicit
        // rejection. Configurable via Integrations:MaxSyncAttempts for tests/tuning.
        private async Task ApplyTimeoutPolicyAsync(Booking booking, OperatorIntegration integration, CancellationToken ct)
        {
            var maxAttempts = _configuration.GetValue<int?>("Integrations:MaxSyncAttempts") ?? DefaultMaxConfirmAttempts;

            var priorFailedAttempts = await _db.IntegrationSyncLogs.CountAsync(l =>
                l.OperatorIntegrationId == integration.Id
                && l.EntityName == "Booking"
                && l.EntityKey == booking.Id.ToString()
                && l.Operation == ConfirmBookingPurpose
                && l.Status == IntegrationSyncStatus.Failed, ct);

            if (priorFailedAttempts + 1 >= maxAttempts)
            {
                await RejectConfirmedBookingAsync(booking,
                    $"Operator ERP did not confirm the booking after {priorFailedAttempts + 1} attempts (timed out or unreachable).",
                    ct);
            }
        }

        // The compensating transaction for a booking the operator's ERP has, one way or another,
        // said no to. Reuses the exact shape of PaymentConfirmationService's paid-but-seats-lost
        // path and CancellationProcessingService.ApproveAsync: cancel the tickets, hand the seats
        // back to SeatHoldService (still the only class allowed to touch TripSeat.Status), mark
        // the booking Failed, and create an automatic Refund at Requested for
        // RefundProcessingService to pick up from there.
        private async Task RejectConfirmedBookingAsync(Booking booking, string reason, CancellationToken ct)
        {
            // Idempotency guard: once the booking is no longer Confirmed there's nothing left to
            // reject (a previous sweep tick, or this same tick reached via a different path,
            // already did it) — just make sure the flag isn't left dangling.
            if (booking.Status != BookingStatus.Confirmed)
            {
                if (booking.RequiresExternalConfirmation)
                {
                    booking.RequiresExternalConfirmation = false;
                    await _db.SaveChangesAsync(ct);
                }
                return;
            }

            var truncatedReason = reason.Length > 250 ? reason[..250] : reason;

            var tickets = await _db.Tickets
                .Where(t => t.BookingId == booking.Id
                    && t.Status != TicketStatus.Cancelled
                    && t.Status != TicketStatus.Refunded)
                .ToListAsync(ct);

            var cancelledTripSeatIds = new List<Guid>();
            foreach (var ticket in tickets)
            {
                ticket.Status = TicketStatus.Cancelled;
                ticket.CancelledAtUtc = DateTime.UtcNow;
                cancelledTripSeatIds.Add(ticket.TripSeatId);
            }

            booking.Status = BookingStatus.Failed;
            booking.CancelledAtUtc = DateTime.UtcNow;
            booking.CancellationReason = truncatedReason;
            booking.RequiresExternalConfirmation = false;

            var payment = await _db.Payments
                .Where(p => p.BookingId == booking.Id && p.Status == PaymentStatus.Succeeded)
                .OrderByDescending(p => p.PaidAtUtc)
                .FirstOrDefaultAsync(ct);

            if (payment != null)
            {
                _db.Refunds.Add(new Refund
                {
                    BookingId = booking.Id,
                    PaymentId = payment.Id,
                    Amount = payment.Amount,
                    Currency = payment.Currency,
                    Status = RefundStatus.Requested,
                    Reason = $"Automatic refund: {truncatedReason}",
                    RequestedAtUtc = DateTime.UtcNow,
                });
            }
            else
            {
                // Shouldn't normally happen — a Confirmed booking implies a successful payment —
                // but this must never throw and block the rest of the rejection from applying,
                // so it's just logged for someone to notice on the integration screen / server logs.
                _logger.LogWarning(
                    "Booking {BookingId} was rejected by the operator ERP but no successful Payment " +
                    "was found to refund automatically.", booking.Id);
            }

            // Same reasoning as CancellationProcessingService.ApproveAsync: everything above is a
            // tracked-entity change, saved together; the seat release is a separate, immediate
            // ExecuteUpdateAsync call on this same AppDbContext (SeatHoldService.
            // ReleaseCancelledSeatsAsync) — an explicit transaction around both keeps this either
            // fully applied or fully rolled back, instead of risking cancelled tickets on record
            // with their seats still stuck as Booked if the release step failed on its own.
            await using var transaction = await _db.Database.BeginTransactionAsync(ct);
            await _db.SaveChangesAsync(ct);
            await _seatHoldService.ReleaseCancelledSeatsAsync(booking.Id, cancelledTripSeatIds);
            await transaction.CommitAsync(ct);
        }

        private async Task ApplyResultAsync(Booking booking, OperatorIntegration integration, ConfirmBookingResponse? parsed, CancellationToken ct)
        {
            if (parsed == null || string.IsNullOrWhiteSpace(parsed.ExternalBookingKey))
            {
                return; // Reply didn't contain anything usable — treat as a no-op, same as any other malformed/incomplete reply.
            }

            var mapping = await _db.ExternalBookingMappings
                .FirstOrDefaultAsync(m => m.OperatorIntegrationId == integration.Id && m.BookingId == booking.Id, ct);

            if (mapping == null)
            {
                mapping = new ExternalBookingMapping
                {
                    OperatorIntegrationId = integration.Id,
                    BookingId = booking.Id
                };
                _db.ExternalBookingMappings.Add(mapping);
            }

            mapping.ExternalBookingKey = parsed.ExternalBookingKey;
            mapping.ExternalPnr = parsed.ExternalPnr;
            mapping.LastSyncedAtUtc = DateTime.UtcNow;

            var recognizedStatus = Enum.TryParse<BookingStatus>(parsed.Status, ignoreCase: true, out var status)
                ? status
                : (BookingStatus?)null;

            mapping.LastKnownExternalStatus = recognizedStatus;

            booking.ExternalBookingKey = parsed.ExternalBookingKey;
            booking.ExternalPnr = parsed.ExternalPnr;

            // Only an explicit Confirmed from the operator's side clears the flag — Pending,
            // Failed, an unrecognized status string, or no status at all all mean we still don't
            // know for sure their system has really secured this seat, so the sweep keeps
            // retrying next tick instead of assuming success. (Failed/Rejected/etc. get handled
            // separately by the explicit-rejection check in SyncOneAsync, above.)
            if (recognizedStatus == BookingStatus.Confirmed)
            {
                booking.RequiresExternalConfirmation = false;
                booking.ExternalConfirmedAtUtc = DateTime.UtcNow;
            }
        }

        // Chunk 8 task 5: called synchronously from SeatHoldsController before every hold on an
        // ExternalApiManaged trip. Fails OPEN on any integration/network problem — an
        // unreachable ERP must not block every sale on that trip, since TripSeat.Status in our
        // own database is still the authoritative fallback (this is purely an extra check on
        // top of it, not a replacement for it) — but every failure is fully logged here, so a
        // persistently broken integration is visible on the integration screen rather than
        // silently and permanently degrading to "no check at all".
        public async Task<ExternalAvailabilityResult> CheckSeatAvailabilityAsync(Trip trip, CancellationToken ct = default)
        {
            if (AvailabilityCache.TryGetValue(trip.Id, out var cached)
                && DateTime.UtcNow - cached.CachedAtUtc < AvailabilityCacheTtl)
            {
                return cached.Result;
            }

            var integration = await _db.OperatorIntegrations
                .Include(i => i.Endpoints)
                .Where(i => i.BusOperatorId == trip.BusOperatorId && i.IsActive)
                .FirstOrDefaultAsync(ct);

            // No integration configured for this operator — nothing to check against, so don't
            // block the hold; our own seat map is the only source of truth there is right now.
            if (integration == null)
            {
                var openResult = new ExternalAvailabilityResult { Success = true };
                AvailabilityCache[trip.Id] = new CachedAvailability { CachedAtUtc = DateTime.UtcNow, Result = openResult };
                return openResult;
            }

            var endpoint = integration.Endpoints.FirstOrDefault(e => e.IsActive
                && string.Equals(e.Purpose, GetSeatAvailabilityPurpose, StringComparison.OrdinalIgnoreCase));

            var log = new IntegrationSyncLog
            {
                OperatorIntegrationId = integration.Id,
                EntityName = "Trip",
                EntityKey = trip.Id.ToString(),
                Operation = GetSeatAvailabilityPurpose,
                Status = IntegrationSyncStatus.Pending,
                StartedAtUtc = DateTime.UtcNow,
            };

            ExternalAvailabilityResult result;

            if (endpoint == null)
            {
                log.Status = IntegrationSyncStatus.Skipped;
                log.ErrorMessage = "OperatorIntegration has no active endpoint with Purpose 'GetSeatAvailability'.";
                result = new ExternalAvailabilityResult { Success = true, ErrorMessage = log.ErrorMessage };
            }
            else
            {
                try
                {
                    var path = endpoint.PathTemplate.Replace("{tripId}", trip.Id.ToString());
                    var requestUri = new Uri(integration.BaseUrl.TrimEnd('/') + (path.StartsWith('/') ? path : "/" + path));

                    using var request = new HttpRequestMessage(new HttpMethod(endpoint.HttpMethod), requestUri);
                    ApplyAuth(request, integration);

                    var timeoutSeconds = Math.Min(AvailabilityCheckTimeout.TotalSeconds, integration.TimeoutSeconds);
                    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
                    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

                    using var response = await _httpClient.SendAsync(request, linkedCts.Token);
                    var responseJson = await response.Content.ReadAsStringAsync(ct);
                    log.ResponseJson = responseJson;

                    if (!response.IsSuccessStatusCode)
                    {
                        log.Status = IntegrationSyncStatus.Failed;
                        log.ErrorMessage = $"Operator API returned {(int)response.StatusCode} {response.StatusCode}.";
                        result = new ExternalAvailabilityResult { Success = false, ErrorMessage = log.ErrorMessage };
                    }
                    else
                    {
                        var parsed = JsonSerializer.Deserialize<SeatAvailabilityResponse>(responseJson, JsonOpts);
                        var sold = new HashSet<string>(
                            parsed?.SoldSeatNumbers ?? new List<string>(),
                            StringComparer.OrdinalIgnoreCase);

                        log.Status = IntegrationSyncStatus.Succeeded;
                        integration.LastSuccessfulSyncAtUtc = DateTime.UtcNow;
                        result = new ExternalAvailabilityResult { Success = true, SoldSeatNumbers = sold };
                    }
                }
                catch (Exception ex)
                {
                    log.Status = IntegrationSyncStatus.Failed;
                    log.ErrorMessage = ex.Message;
                    _logger.LogWarning(ex,
                        "GetSeatAvailability failed for Trip {TripId} via OperatorIntegration {IntegrationId}.",
                        trip.Id, integration.Id);
                    result = new ExternalAvailabilityResult { Success = false, ErrorMessage = ex.Message };
                }
            }

            log.CompletedAtUtc = DateTime.UtcNow;
            _db.IntegrationSyncLogs.Add(log);
            await _db.SaveChangesAsync(ct);

            AvailabilityCache[trip.Id] = new CachedAvailability { CachedAtUtc = DateTime.UtcNow, Result = result };
            return result;
        }

        // Chunk 8 task 7 (P1): best-effort propagation of a cancellation to the operator's ERP.
        // Deliberately never throws — called from CancellationProcessingService.ApproveAsync
        // AFTER the refund/seat-release transaction has already committed, so a failure here
        // must never undo or block that. A failure just becomes a Failed sync log, same as
        // every other call this engine makes, visible on the integration screen.
        public async Task TryCancelExternalBookingAsync(Guid bookingId, CancellationToken ct = default)
        {
            var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId, ct);
            if (booking == null || string.IsNullOrWhiteSpace(booking.ExternalBookingKey))
            {
                return; // Never synced with an operator ERP in the first place — nothing to cancel there.
            }

            var integration = await _db.OperatorIntegrations
                .Include(i => i.Endpoints)
                .Where(i => i.BusOperatorId == booking.BusOperatorId && i.IsActive)
                .FirstOrDefaultAsync(ct);

            if (integration == null)
            {
                return;
            }

            var endpoint = integration.Endpoints.FirstOrDefault(e => e.IsActive
                && string.Equals(e.Purpose, CancelBookingPurpose, StringComparison.OrdinalIgnoreCase));

            var log = new IntegrationSyncLog
            {
                OperatorIntegrationId = integration.Id,
                EntityName = "Booking",
                EntityKey = booking.Id.ToString(),
                Operation = CancelBookingPurpose,
                Status = IntegrationSyncStatus.Pending,
                StartedAtUtc = DateTime.UtcNow,
            };

            if (endpoint == null)
            {
                log.Status = IntegrationSyncStatus.Skipped;
                log.ErrorMessage = "OperatorIntegration has no active endpoint with Purpose 'CancelBooking'.";
            }
            else
            {
                try
                {
                    var path = endpoint.PathTemplate
                        .Replace("{bookingId}", booking.Id.ToString())
                        .Replace("{externalBookingKey}", Uri.EscapeDataString(booking.ExternalBookingKey));
                    var requestUri = new Uri(integration.BaseUrl.TrimEnd('/') + (path.StartsWith('/') ? path : "/" + path));

                    var requestJson = JsonSerializer.Serialize(new
                    {
                        bookingId = booking.Id,
                        externalBookingKey = booking.ExternalBookingKey
                    });
                    log.RequestJson = requestJson;

                    using var request = new HttpRequestMessage(new HttpMethod(endpoint.HttpMethod), requestUri)
                    {
                        Content = new StringContent(requestJson, Encoding.UTF8, "application/json")
                    };
                    ApplyAuth(request, integration);

                    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(integration.TimeoutSeconds));
                    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                    using var response = await _httpClient.SendAsync(request, linkedCts.Token);
                    log.ResponseJson = await response.Content.ReadAsStringAsync(ct);

                    log.Status = response.IsSuccessStatusCode ? IntegrationSyncStatus.Succeeded : IntegrationSyncStatus.Failed;
                    if (response.IsSuccessStatusCode)
                    {
                        integration.LastSuccessfulSyncAtUtc = DateTime.UtcNow;
                    }
                    else
                    {
                        log.ErrorMessage = $"Operator API returned {(int)response.StatusCode} {response.StatusCode}.";
                    }
                }
                catch (Exception ex)
                {
                    log.Status = IntegrationSyncStatus.Failed;
                    log.ErrorMessage = ex.Message;
                    _logger.LogWarning(ex,
                        "CancelBooking propagation failed for Booking {BookingId} via OperatorIntegration {IntegrationId}.",
                        booking.Id, integration.Id);
                }
            }

            log.CompletedAtUtc = DateTime.UtcNow;
            _db.IntegrationSyncLogs.Add(log);
            await _db.SaveChangesAsync(ct);
        }

        // Backs the admin integration screen's "Test connection" button (Chunk 8 task 9,
        // Integrations.Manage-only — see OperatorIntegrationsController). Deliberately generic —
        // hits BaseUrl + "/health" rather than any one Purpose-specific endpoint, so it works
        // the same way regardless of which endpoints happen to be configured yet, and doesn't
        // require picking a real bookingId/tripId just to check reachability. apps/mock-erp
        // implements this route; a real operator ERP would need to add an equivalent one (noted
        // in the contract doc).
        public async Task<TestConnectionResult> TestConnectionAsync(OperatorIntegration integration, CancellationToken ct = default)
        {
            var log = new IntegrationSyncLog
            {
                OperatorIntegrationId = integration.Id,
                EntityName = "OperatorIntegration",
                EntityKey = integration.Id.ToString(),
                Operation = TestConnectionOperation,
                Status = IntegrationSyncStatus.Pending,
                StartedAtUtc = DateTime.UtcNow,
            };

            var sw = Stopwatch.StartNew();
            TestConnectionResult result;

            try
            {
                var requestUri = new Uri(integration.BaseUrl.TrimEnd('/') + "/health");
                using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
                ApplyAuth(request, integration);

                var timeoutSeconds = Math.Min(10, integration.TimeoutSeconds);
                using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);
                using var response = await _httpClient.SendAsync(request, linkedCts.Token);
                log.ResponseJson = await response.Content.ReadAsStringAsync(ct);
                sw.Stop();

                log.Status = response.IsSuccessStatusCode ? IntegrationSyncStatus.Succeeded : IntegrationSyncStatus.Failed;
                result = new TestConnectionResult
                {
                    Success = response.IsSuccessStatusCode,
                    Message = response.IsSuccessStatusCode
                        ? $"Reached {integration.BaseUrl} — {(int)response.StatusCode} {response.StatusCode}."
                        : $"{integration.BaseUrl} responded {(int)response.StatusCode} {response.StatusCode}.",
                    StatusCode = (int)response.StatusCode,
                    DurationMs = sw.ElapsedMilliseconds,
                };

                if (response.IsSuccessStatusCode)
                {
                    integration.LastSuccessfulSyncAtUtc = DateTime.UtcNow;
                }
                else
                {
                    log.ErrorMessage = result.Message;
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                log.Status = IntegrationSyncStatus.Failed;
                log.ErrorMessage = ex.Message;
                result = new TestConnectionResult { Success = false, Message = ex.Message, DurationMs = sw.ElapsedMilliseconds };
            }

            log.CompletedAtUtc = DateTime.UtcNow;
            _db.IntegrationSyncLogs.Add(log);
            await _db.SaveChangesAsync(ct);

            return result;
        }

        // Chunk 8 task 3: SecretReference is a POINTER, never the secret itself. "env:VAR_NAME"
        // resolves VAR_NAME from IConfiguration (which includes real process environment
        // variables in ASP.NET Core's default configuration pipeline) at call time — the actual
        // secret value is never stored in the database and never appears in an API response (see
        // OperatorIntegrationResponseDto, which exposes only HasSecret + a masked preview). A
        // bare value with no "env:" prefix is still honored so nothing seeded before this
        // convention existed breaks, but every integration from here on should use "env:...".
        private string ResolveSecret(OperatorIntegration integration)
        {
            var reference = integration.SecretReference;
            if (string.IsNullOrWhiteSpace(reference))
            {
                return string.Empty;
            }

            const string envPrefix = "env:";
            if (reference.StartsWith(envPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var variableName = reference[envPrefix.Length..];
                return _configuration[variableName] ?? Environment.GetEnvironmentVariable(variableName) ?? string.Empty;
            }

            return reference;
        }

        private void ApplyAuth(HttpRequestMessage request, OperatorIntegration integration)
        {
            var secret = ResolveSecret(integration);

            switch (integration.AuthType)
            {
                case IntegrationAuthType.ApiKey when !string.IsNullOrWhiteSpace(integration.ApiKeyHeaderName):
                    request.Headers.TryAddWithoutValidation(integration.ApiKeyHeaderName, secret);
                    break;

                case IntegrationAuthType.BearerToken:
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secret);
                    break;

                case IntegrationAuthType.Basic:
                    var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(secret));
                    request.Headers.Authorization = new AuthenticationHeaderValue("Basic", encoded);
                    break;

                // None, a misconfigured ApiKey (no header name set), and OAuth2 (needs a
                // token-fetch flow this project doesn't have yet) all send no auth header — same
                // "not implemented yet" reasoning as IPaymentGatewayVerifier for anything
                // genuinely gateway/provider-specific.
                default:
                    break;
            }
        }

        private class ConfirmBookingResponse
        {
            public string? ExternalBookingKey { get; set; }
            public string? ExternalPnr { get; set; }
            public string? Status { get; set; }
        }

        private class SeatAvailabilityResponse
        {
            public string? TripId { get; set; }
            public List<string>? SoldSeatNumbers { get; set; }
        }

        private class CachedAvailability
        {
            public DateTime CachedAtUtc { get; init; }
            public ExternalAvailabilityResult Result { get; init; } = default!;
        }
    }

    // Result of CheckSeatAvailabilityAsync — public because SeatHoldsController consumes it
    // directly. Success=false means the check itself couldn't be completed (network/timeout/
    // non-2xx), NOT that seats are unavailable; the caller fails open on Success=false (see
    // SeatHoldsController's comment for why) and only refuses seats that are actually present in
    // SoldSeatNumbers on a Success=true result.
    public class ExternalAvailabilityResult
    {
        public bool Success { get; init; }
        public HashSet<string> SoldSeatNumbers { get; init; } = new(StringComparer.OrdinalIgnoreCase);
        public string? ErrorMessage { get; init; }
    }

    // Result of TestConnectionAsync — consumed by OperatorIntegrationsController's
    // test-connection endpoint and rendered directly on the admin integration screen.
    public class TestConnectionResult
    {
        public bool Success { get; init; }
        public string Message { get; init; } = string.Empty;
        public int? StatusCode { get; init; }
        public long DurationMs { get; init; }
    }
}

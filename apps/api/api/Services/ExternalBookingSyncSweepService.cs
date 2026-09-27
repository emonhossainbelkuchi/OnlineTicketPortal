using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TicketPortal.Api.Services
{
    // The engine behind concept doc §3.2's "TicketPortal calls the operator's API to sync and
    // check booking status" for API-connected operators. Wakes up periodically and asks
    // ExternalBookingSyncService to attempt a confirm-booking call for every Booking still
    // waiting on the operator's side (Booking.RequiresExternalConfirmation == true).
    //
    // Same cadence family as PaymentReconciliationSweepService — this is "did the operator's
    // system get back to us yet", not the sub-second seat-hold race, so checking every couple of
    // minutes is more than enough.
    //
    // Register once in Program.cs with:
    //   builder.Services.AddHostedService<ExternalBookingSyncSweepService>();
    public class ExternalBookingSyncSweepService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ExternalBookingSyncSweepService> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(2);

        public ExternalBookingSyncSweepService(
            IServiceScopeFactory scopeFactory,
            ILogger<ExternalBookingSyncSweepService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        // ASP.NET calls this once when the app starts, and it just keeps looping until the app shuts down.
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(Interval);

            while (!stoppingToken.IsCancellationRequested
                   && await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var syncService =
                        scope.ServiceProvider.GetRequiredService<ExternalBookingSyncService>();

                    var attempted = await syncService.SyncPendingBookingsAsync(stoppingToken);
                    if (attempted > 0)
                    {
                        _logger.LogInformation(
                            "External booking sync sweep attempted {Count} pending booking(s).",
                            attempted);
                    }
                }
                catch (Exception ex)
                {
                    // Same reasoning as every other sweep here: never let one bad run kill the
                    // whole background worker — log it and quietly try again next tick.
                    _logger.LogError(ex, "External booking sync sweep failed.");
                }
            }
        }
    }
}

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TicketPortal.Api.Services
{
    // The stuck-payment counterpart to SeatHoldExpirySweepService: wakes up periodically and
    // asks PaymentConfirmationService to find any payment that succeeded but whose booking/
    // tickets never got finalized, then flags it via a PaymentHistory row (see
    // PaymentConfirmationService.FlagStuckPaymentsAsync for why the flag lives there and not on
    // the payment's own Status).
    //
    // Much slower cadence than the 15-second seat-hold sweep, on purpose — a stuck payment is a
    // rare failure case that needs a human to look at it, not a per-second race to reclaim
    // inventory, so there's no benefit to checking more often than this.
    //
    // Register once in Program.cs with:
    //   builder.Services.AddHostedService<PaymentReconciliationSweepService>();
    public class PaymentReconciliationSweepService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PaymentReconciliationSweepService> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        // How old a Succeeded payment has to be, with nothing to show for it, before the sweep
        // treats it as genuinely stuck rather than just a normal in-flight checkout — the
        // booking/ticket half of ConfirmOnlinePaymentAsync usually finishes in well under a
        // second, so 10 minutes is generous headroom, not a tight deadline.
        private static readonly TimeSpan StaleAfter = TimeSpan.FromMinutes(10);

        public PaymentReconciliationSweepService(
            IServiceScopeFactory scopeFactory,
            ILogger<PaymentReconciliationSweepService> logger)
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
                    var paymentConfirmationService =
                        scope.ServiceProvider.GetRequiredService<PaymentConfirmationService>();

                    var flagged = await paymentConfirmationService.FlagStuckPaymentsAsync(StaleAfter);
                    if (flagged > 0)
                    {
                        _logger.LogWarning(
                            "Payment reconciliation sweep flagged {Count} payment(s) with no confirmed booking/tickets.",
                            flagged);
                    }
                }
                catch (Exception ex)
                {
                    // Same reasoning as SeatHoldExpirySweepService: never let one bad sweep run
                    // kill the whole background worker — log it and quietly try again next tick.
                    _logger.LogError(ex, "Payment reconciliation sweep failed.");
                }
            }
        }
    }
}

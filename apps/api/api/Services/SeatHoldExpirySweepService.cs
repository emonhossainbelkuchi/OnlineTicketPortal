using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TicketPortal.Api.Services
{
    // This is the "clock" that makes the 3/5 minute seat-hold timer actually do something.
    // It's a background worker that just wakes up every 15 seconds, forever, and asks
    // SeatHoldService to release any seat holds whose time has run out. Without this running
    // somewhere, holds would sit as "Held" forever even after a customer walks away.
    //
    // Register it once in Program.cs with:
    //   builder.Services.AddHostedService<SeatHoldExpirySweepService>();
    //
    // 15 seconds is deliberately short compared to the 3-5 minute hold window, so a seat is
    // never stuck looking "taken" for much longer than the customer's own countdown really ran.
    public class SeatHoldExpirySweepService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SeatHoldExpirySweepService> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);

        public SeatHoldExpirySweepService(
            IServiceScopeFactory scopeFactory,
            ILogger<SeatHoldExpirySweepService> logger)
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
                    var seatHoldService = scope.ServiceProvider.GetRequiredService<SeatHoldService>();

                    // Keep sweeping in a loop (not just once) so that if a LOT of holds expired
                    // at once (say, right after a big rush of bookings), we clear the whole
                    // backlog now instead of trickling it out one batch every 15 seconds.
                    int released;
                    do
                    {
                        released = await seatHoldService.ExpireOverdueHoldsAsync();
                    }
                    while (released > 0 && !stoppingToken.IsCancellationRequested);
                }
                catch (Exception ex)
                {
                    // If one sweep run fails for any reason, don't let it kill the whole
                    // background worker — just log it and quietly try again on the next tick.
                    _logger.LogError(ex, "Seat hold expiry sweep failed.");
                }
            }
        }
    }
}

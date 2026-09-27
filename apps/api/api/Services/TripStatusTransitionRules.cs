using TicketPortal.Api.Models.Enums;

namespace TicketPortal.Api.Services
{
    // Chunk 5, P0 task 5 ("Status transitions: define allowed moves ... and reject the rest
    // with a clear message"). Before this existed, TripsController.Update accepted any
    // dto.Status value with no ordering check at all — a caller could flip a Completed trip
    // straight back to Scheduled, or a Scheduled trip straight to Arrived, skipping every
    // real-world step in between, with only a TripStatusHistory row as evidence anything odd
    // happened.
    //
    // The table below is the plan's own chain (Scheduled -> Boarding -> Departed -> Running ->
    // Arrived -> Completed; Delayed <-> Scheduled; Cancelled terminal), with two small,
    // deliberate extensions documented inline where they diverge from that literal chain.
    public static class TripStatusTransitionRules
    {
        private static readonly Dictionary<TripStatus, TripStatus[]> Allowed = new()
        {
            // The normal, one-way journey lifecycle, plus the two side-doors every one of
            // these pre-departure states needs: sliding into Delayed, and being called off
            // outright (see CanCancel below — Cancel itself always goes through
            // TripCancellationService, never a plain Update, but the table still has to say
            // which FROM-states are legal so Update can refuse the rest with a clear message).
            [TripStatus.Scheduled] = new[] { TripStatus.Boarding, TripStatus.Delayed, TripStatus.Cancelled },
            [TripStatus.Boarding] = new[] { TripStatus.Departed, TripStatus.Delayed, TripStatus.Cancelled },
            [TripStatus.Departed] = new[] { TripStatus.Running },
            [TripStatus.Running] = new[] { TripStatus.Arrived },
            [TripStatus.Arrived] = new[] { TripStatus.Completed },

            // Delayed is a side-branch of the main chain, not a step in it: the plan's own
            // "Delayed<->Scheduled" covers a delay being lifted with nothing else changed, and
            // this also lets a delayed trip carry on into Boarding once it's actually ready to
            // go — without this, a trip marked Delayed could never legitimately reach Departed
            // again without first being edited back to Scheduled and re-progressed from there,
            // which would fight the real workflow (a delay resolves by the bus finally leaving,
            // not by un-delaying it on paper first). Still cancellable, same as Scheduled/Boarding.
            [TripStatus.Delayed] = new[] { TripStatus.Scheduled, TripStatus.Boarding, TripStatus.Cancelled },

            // Terminal states — the plan is explicit that Cancelled is terminal; Completed is
            // the natural symmetric case (a trip that has already fully happened cannot be
            // un-happened, delayed, or cancelled after the fact).
            [TripStatus.Completed] = Array.Empty<TripStatus>(),
            [TripStatus.Cancelled] = Array.Empty<TripStatus>(),
        };

        // Same-status "transitions" (e.g. re-saving a trip that's already Scheduled without
        // touching Status) aren't a move at all — TripsController.Update already only writes a
        // TripStatusHistory row when trip.Status != previousStatus, so this only ever needs to
        // judge REAL changes.
        public static bool IsAllowed(TripStatus from, TripStatus to)
        {
            if (from == to) return true;
            return Allowed.TryGetValue(from, out var moves) && moves.Contains(to);
        }

        // The one question TripsController.Cancel / TripCancellationService actually need —
        // kept as its own named check (rather than callers writing IsAllowed(x, Cancelled)
        // inline) so "can this trip still be cancelled at all" reads as one clear call at
        // every call site, and so the answer can never quietly drift from the table above.
        public static bool CanCancel(TripStatus current) =>
            Allowed.TryGetValue(current, out var moves) && moves.Contains(TripStatus.Cancelled);
    }
}

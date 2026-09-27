namespace TicketPortal.Api.Services
{
    // Chunk 3 gap register #3: "Search 'date' is a UTC calendar day, wrong for Dhaka (UTC+6)" —
    // a customer picking "today" for a 05:00 Dhaka departure got nothing back, because the
    // search endpoints turned the DateOnly straight into `date.ToDateTime(..., DateTimeKind.Utc)`
    // and matched it against Trip.DepartureTimeUtc, which is a real UTC instant. Every stored
    // timestamp in this project stays UTC (Trip.DepartureTimeUtc, everything else) — only the
    // *meaning* of "which calendar day the customer meant" needs to shift to Asia/Dhaka, and only
    // at the search boundary. Both TripsController.Search and BookingBusesController.GetAll call
    // this instead of doing their own (previously wrong) conversion.
    public static class DhakaClock
    {
        private static readonly TimeZoneInfo Zone = ResolveTimeZone();

        private static TimeZoneInfo ResolveTimeZone()
        {
            // "Asia/Dhaka" is the IANA id (Linux/macOS, and modern .NET on Windows with ICU);
            // "Bangladesh Standard Time" is the Windows-specific id, for a plain Windows host
            // without the ICU/IANA tzdata. Bangladesh has been a fixed UTC+6 with no DST since
            // 2009, so if neither is registered on the host, building the zone by hand is a
            // correct (if unnamed) fallback rather than letting search fail outright.
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Dhaka");
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
            }

            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time");
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
            }

            return TimeZoneInfo.CreateCustomTimeZone(
                "Asia/Dhaka (fallback)",
                TimeSpan.FromHours(6),
                "Bangladesh Standard Time (fallback)",
                "Bangladesh Standard Time (fallback)");
        }

        // Converts the Dhaka calendar day the customer picked into the [start, end) range of
        // UTC instants that day covers, for a `WHERE DepartureTimeUtc >= start && < end` query.
        // A 05:30 or 23:30 Dhaka departure on `dhakaDate` both land inside this range; the same
        // trips would have been split across two different UTC calendar days before this fix.
        public static (DateTime StartUtc, DateTime EndUtc) DayRangeUtc(DateOnly dhakaDate)
        {
            var startLocal = DateTime.SpecifyKind(dhakaDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
            var endLocal = startLocal.AddDays(1);

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, Zone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(endLocal, Zone);
            return (startUtc, endUtc);
        }
    }
}

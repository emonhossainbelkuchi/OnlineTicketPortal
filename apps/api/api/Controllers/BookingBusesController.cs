using TicketPortal.Api.Data;
using TicketPortal.Api.DTO;
using TicketPortal.Api.Models.Enums;
using TicketPortal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TicketPortal.Api.Controllers
{
  // Route discovery and seat-map browsing must stay public; only creating a
  // hold/booking is authenticated by the dedicated booking endpoints.
  [AllowAnonymous]
  [Route("api/booking-buses")]
  [ApiController]
  public class BookingBusesController(AppDbContext db, IConfiguration configuration) : ControllerBase
  {
    // Chunk 3 task 1: this used to be its own private copy of the "which trip statuses are
    // unsellable" list — now shared with TripsController.Search and SeatHoldService via
    // TripSellability, so the three can't quietly drift apart again (Chunk 3 gap register #1).
    private static readonly IReadOnlyCollection<TripStatus> NonBookableStatuses = TripSellability.NonBookableStatuses;

    // Chunk 3 task 1 (shared config key with TripsController/SeatHoldService/SeatHoldsController):
    // how long before a still-Scheduled departure sales close. Zero by default, i.e. exactly the
    // cutoff this controller already used ("DepartureTimeUtc > now") before this key existed.
    private TimeSpan StopSalesWindow =>
        TimeSpan.FromMinutes(configuration.GetValue("SeatHold:StopSalesMinutesBeforeDeparture", 0));

    // =========================================================
    // GET: /api/booking-buses
    // Query params (all optional):
    //   ?from=<terminalId>        (Guid)
    //   ?to=<terminalId>          (Guid)
    //   ?date=2026-09-20
    // =========================================================
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] DateTime? date)
    {
      var now = DateTime.UtcNow;
      var cutoffUtc = now.Add(StopSalesWindow);

      // -----------------------------------------------------
      // 1. Base trip query — future + bookable + available seats
      // -----------------------------------------------------
      var tripQuery = db.Trips
          .Where(t =>
              t.Bus.IsActive &&
              t.DepartureTimeUtc > cutoffUtc &&
              !NonBookableStatuses.Contains(t.Status) &&
              t.TripSeats.Any(s =>
                  s.Status == TripSeatStatus.Available));

      // -----------------------------------------------------
      // 2. Filter by DEPARTURE TERMINAL
      // -----------------------------------------------------
      if (!string.IsNullOrWhiteSpace(from))
      {
        var fromTrim = from.Trim();

        if (Guid.TryParse(fromTrim, out var fromId))
        {
          tripQuery = tripQuery.Where(t =>
              t.DepartureTerminalId == fromId);
        }
        else
        {
          tripQuery = tripQuery.Where(t =>
              t.DepartureTerminal.Name == fromTrim ||
              t.DepartureTerminal.Code == fromTrim);
        }
      }

      // -----------------------------------------------------
      // 3. Filter by ARRIVAL TERMINAL
      // -----------------------------------------------------
      if (!string.IsNullOrWhiteSpace(to))
      {
        var toTrim = to.Trim();

        if (Guid.TryParse(toTrim, out var toId))
        {
          tripQuery = tripQuery.Where(t =>
              t.ArrivalTerminalId == toId);
        }
        else
        {
          tripQuery = tripQuery.Where(t =>
              t.ArrivalTerminal.Name == toTrim ||
              t.ArrivalTerminal.Code == toTrim);
        }
      }

      // -----------------------------------------------------
      // 4. Filter by DATE
      // Chunk 3 task 2: `date` means a Dhaka calendar day, same fix and same helper as
      // TripsController.Search — see DhakaClock for why this can't just be date.Value.Date.
      // -----------------------------------------------------
      if (date.HasValue)
      {
        var (start, end) = DhakaClock.DayRangeUtc(DateOnly.FromDateTime(date.Value));
        tripQuery = tripQuery.Where(t =>
            t.DepartureTimeUtc >= start &&
            t.DepartureTimeUtc < end);
      }

      // -----------------------------------------------------
      // 5. Distinct bus ids
      // -----------------------------------------------------
      var busIds = await tripQuery
          .Select(t => t.BusId)
          .Distinct()
          .ToListAsync();

      if (busIds.Count == 0)
      {
        return Ok(new
        {
          buses = Array.Empty<BusListDto>(),
          totalCount = 0
        });
      }

      // -----------------------------------------------------
      // 6. Load buses
      // -----------------------------------------------------
      var buses = await db.Buses
          .AsNoTracking()
          .Include(b => b.Images)
          .Include(b => b.AmenityMappings)
              .ThenInclude(am => am.Amenity)
          .Where(b =>
              b.IsActive &&
              busIds.Contains(b.Id))
          .ToListAsync();

      // -----------------------------------------------------
      // 7. Load matching trips
      // -----------------------------------------------------
      var trips = await tripQuery
          .AsNoTracking()
          .Include(t => t.Schedule)
          .Include(t => t.DepartureTerminal)
          .Include(t => t.ArrivalTerminal)
          .Include(t => t.TripSeats)
          .Where(t => busIds.Contains(t.BusId))
          .OrderBy(t => t.DepartureTimeUtc)
          .ToListAsync();

      var tripsByBus = trips
          .GroupBy(t => t.BusId)
          .ToDictionary(
              g => g.Key,
              g => g.OrderBy(t => t.DepartureTimeUtc).ToList());

      // -----------------------------------------------------
      // 8. Build DTOs
      // -----------------------------------------------------
      var result = new List<BusListDto>();

      foreach (var bus in buses)
      {
        if (!tripsByBus.TryGetValue(bus.Id, out var busTrips) ||
            busTrips.Count == 0)
        {
          continue;
        }

        var nextTrip = busTrips.First();

        var dto = new BusListDto
        {
          // BUS
          Id = bus.Id,
          Brand = bus.Brand,
          Model = bus.Model,
          CoachNumber = bus.CoachNumber,
          RegistrationNumber = bus.RegistrationNumber,
          BusType = bus.BusType,
          TotalSeats = bus.TotalSeats,
          HasWifi = bus.HasWifi,
          HasToilet = bus.HasToilet,
          ManufactureYear = bus.ManufactureYear,
          PrimaryImageUrl =
                bus.Images
                    .FirstOrDefault(i => i.IsPrimary)?.ImageUrl
                ?? bus.Images.FirstOrDefault()?.ImageUrl,

          // AMENITIES
          Amenities = bus.AmenityMappings
                .Where(am => am.Amenity != null && am.Amenity.IsActive)
                .Select(am => am.Amenity.Name)
                .ToList(),

          // TRIP
          TripId = nextTrip.Id,
          TripCode = nextTrip.TripCode,
          BaseFare = nextTrip.BaseFare,
          Currency = nextTrip.Currency,
          DepartureTimeUtc = nextTrip.DepartureTimeUtc,
          ArrivalTimeUtc = nextTrip.ArrivalTimeUtc,
          Duration = FormatDuration(
                nextTrip.ArrivalTimeUtc - nextTrip.DepartureTimeUtc),
          TripStatus = nextTrip.Status,
          ReportingTimeUtc = nextTrip.ReportingTimeUtc,

          // ROUTE
          DepartureTerminalId = nextTrip.DepartureTerminalId,
          DepartureTerminalName = nextTrip.DepartureTerminal?.Name,
          DepartureCity = nextTrip.DepartureTerminal?.City,
          ArrivalTerminalId = nextTrip.ArrivalTerminalId,
          ArrivalTerminalName = nextTrip.ArrivalTerminal?.Name,
          ArrivalCity = nextTrip.ArrivalTerminal?.City,

          // SCHEDULE
          ScheduleId = nextTrip.ScheduleId,
          ScheduleCode = nextTrip.Schedule?.ScheduleCode,

          // SEAT COUNTS
          AvailableSeats = nextTrip.TripSeats
                .Count(s => s.Status == TripSeatStatus.Available),
          HeldSeats = nextTrip.TripSeats
                .Count(s => s.Status == TripSeatStatus.Held),
          BookedSeats = nextTrip.TripSeats
                .Count(s => s.Status == TripSeatStatus.Booked),
          BlockedSeats = nextTrip.TripSeats
                .Count(s => s.Status == TripSeatStatus.Blocked),

          // EXTRA
          UpcomingTripCount = busTrips.Count,
          Rating = null,
          TotalReviews = 0,
          Seats = null
        };

        result.Add(dto);
      }

      var sorted = result
          .OrderBy(b => b.DepartureTimeUtc)
          .ThenBy(b => b.Brand)
          .ToList();

      return Ok(new
      {
        buses = sorted,
        totalCount = sorted.Count
      });
    }

    // =========================================================
    // GET: /api/booking-buses/available-terminals
    // Distinct departure + arrival terminals that have
    // at least one bookable future trip with available seats.
    // Used to populate From/To dropdowns.
    // =========================================================
    [HttpGet("available-terminals")]
    public async Task<IActionResult> GetAvailableTerminals()
    {
      var now = DateTime.UtcNow;
      var cutoffUtc = now.Add(StopSalesWindow);

      // -----------------------------------------------------
      // 1. Load bookable trips with terminals
      // -----------------------------------------------------
      var trips = await db.Trips
          .AsNoTracking()
          .Where(t =>
              t.Bus.IsActive &&
              t.DepartureTimeUtc > cutoffUtc &&
              !NonBookableStatuses.Contains(t.Status) &&
              t.TripSeats.Any(s =>
                  s.Status == TripSeatStatus.Available))
          .Select(t => new
          {
            DepartureTerminalId = t.DepartureTerminal.Id,
            DepartureTerminalName = t.DepartureTerminal.Name,
            DepartureTerminalCode = t.DepartureTerminal.Code,
            DepartureTerminalCity = t.DepartureTerminal.City,

            ArrivalTerminalId = t.ArrivalTerminal.Id,
            ArrivalTerminalName = t.ArrivalTerminal.Name,
            ArrivalTerminalCode = t.ArrivalTerminal.Code,
            ArrivalTerminalCity = t.ArrivalTerminal.City
          })
          .ToListAsync();

      if (trips.Count == 0)
      {
        return Ok(new
        {
          departureTerminals = Array.Empty<object>(),
          arrivalTerminals = Array.Empty<object>()
        });
      }

      // -----------------------------------------------------
      // 2. Distinct departure terminals
      // -----------------------------------------------------
      var departureTerminals = trips
          .GroupBy(t => t.DepartureTerminalId)
          .Select(g => new
          {
            id = g.Key,
            name = g.First().DepartureTerminalName,
            code = g.First().DepartureTerminalCode,
            city = g.First().DepartureTerminalCity
          })
          .OrderBy(t => t.name)
          .ToList();

      // -----------------------------------------------------
      // 3. Distinct arrival terminals
      // -----------------------------------------------------
      var arrivalTerminals = trips
          .GroupBy(t => t.ArrivalTerminalId)
          .Select(g => new
          {
            id = g.Key,
            name = g.First().ArrivalTerminalName,
            code = g.First().ArrivalTerminalCode,
            city = g.First().ArrivalTerminalCity
          })
          .OrderBy(t => t.name)
          .ToList();

      return Ok(new
      {
        departureTerminals,
        arrivalTerminals
      });
    }

    // =========================================================
    // GET: /api/booking-buses/{id}
    // One bus + full seat map
    // =========================================================
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
      var now = DateTime.UtcNow;
      var cutoffUtc = now.Add(StopSalesWindow);

      var bus = await db.Buses
          .AsNoTracking()
          .Include(b => b.Images)
          .Include(b => b.AmenityMappings)
              .ThenInclude(am => am.Amenity)
          .FirstOrDefaultAsync(b => b.Id == id && b.IsActive);

      if (bus == null)
      {
        return NotFound(new { message = "Bus not found or inactive." });
      }

      var trips = await db.Trips
          .AsNoTracking()
          .Include(t => t.Schedule)
          .Include(t => t.DepartureTerminal)
          .Include(t => t.ArrivalTerminal)
          .Include(t => t.TripSeats)
              .ThenInclude(ts => ts.Seat)
          .Where(t =>
              t.BusId == id &&
              t.DepartureTimeUtc > cutoffUtc &&
              !NonBookableStatuses.Contains(t.Status) &&
              t.TripSeats.Any(s =>
                  s.Status == TripSeatStatus.Available))
          .OrderBy(t => t.DepartureTimeUtc)
          .ToListAsync();

      if (trips.Count == 0)
      {
        return NotFound(new
        {
          message = "No bookable future trip for this bus."
        });
      }

      var nextTrip = trips.First();

      var seats = nextTrip.TripSeats
          .OrderBy(s => s.Seat.RowNumber)
          .ThenBy(s => s.Seat.ColumnNumber)
          .Select(ts => new BusSeatDto
          {
            TripSeatId = ts.Id,
            SeatId = ts.SeatId,
            SeatNumber = ts.SeatNumber,
            SeatType = ts.SeatType,
            Fare = ts.Fare,
            Status = ts.Status,
            IsAvailable = ts.Status == TripSeatStatus.Available,
            IsHeld = ts.Status == TripSeatStatus.Held,
            IsBooked = ts.Status == TripSeatStatus.Booked,
            IsBlocked = ts.Status == TripSeatStatus.Blocked,
            RowNumber = ts.Seat.RowNumber,
            ColumnNumber = ts.Seat.ColumnNumber,
            DeckLevel = ts.Seat.DeckLevel,
            IsWindow = ts.Seat.IsWindow,
            ExtraFare = ts.Seat.ExtraFare,
            IsActive = ts.Seat.IsActive
          })
          .ToList();

      var dto = new BusListDto
      {
        Id = bus.Id,
        Brand = bus.Brand,
        Model = bus.Model,
        CoachNumber = bus.CoachNumber,
        RegistrationNumber = bus.RegistrationNumber,
        BusType = bus.BusType,
        TotalSeats = bus.TotalSeats,
        HasWifi = bus.HasWifi,
        HasToilet = bus.HasToilet,
        ManufactureYear = bus.ManufactureYear,
        PrimaryImageUrl =
              bus.Images
                  .FirstOrDefault(i => i.IsPrimary)?.ImageUrl
              ?? bus.Images.FirstOrDefault()?.ImageUrl,

        Amenities = bus.AmenityMappings
              .Where(am => am.Amenity != null && am.Amenity.IsActive)
              .Select(am => am.Amenity.Name)
              .ToList(),

        TripId = nextTrip.Id,
        TripCode = nextTrip.TripCode,
        BaseFare = nextTrip.BaseFare,
        Currency = nextTrip.Currency,
        DepartureTimeUtc = nextTrip.DepartureTimeUtc,
        ArrivalTimeUtc = nextTrip.ArrivalTimeUtc,
        Duration = FormatDuration(
              nextTrip.ArrivalTimeUtc - nextTrip.DepartureTimeUtc),
        TripStatus = nextTrip.Status,
        ReportingTimeUtc = nextTrip.ReportingTimeUtc,

        DepartureTerminalId = nextTrip.DepartureTerminalId,
        DepartureTerminalName = nextTrip.DepartureTerminal?.Name,
        DepartureCity = nextTrip.DepartureTerminal?.City,
        ArrivalTerminalId = nextTrip.ArrivalTerminalId,
        ArrivalTerminalName = nextTrip.ArrivalTerminal?.Name,
        ArrivalCity = nextTrip.ArrivalTerminal?.City,

        ScheduleId = nextTrip.ScheduleId,
        ScheduleCode = nextTrip.Schedule?.ScheduleCode,

        AvailableSeats = seats.Count(s => s.IsAvailable),
        HeldSeats = seats.Count(s => s.IsHeld),
        BookedSeats = seats.Count(s => s.IsBooked),
        BlockedSeats = seats.Count(s => s.IsBlocked),

        UpcomingTripCount = trips.Count,
        Rating = null,
        TotalReviews = 0,
        Seats = seats
      };

      return Ok(dto);
    }

    // =========================================================
    // Helper: format duration "6h 30m"
    // =========================================================
    private static string FormatDuration(TimeSpan span)
    {
      if (span.TotalMinutes < 0) span = TimeSpan.Zero;
      var hours = (int)span.TotalHours;
      var minutes = span.Minutes;

      if (hours > 0 && minutes > 0) return $"{hours}h {minutes}m";
      if (hours > 0) return $"{hours}h";
      return $"{minutes}m";
    }
  }
}

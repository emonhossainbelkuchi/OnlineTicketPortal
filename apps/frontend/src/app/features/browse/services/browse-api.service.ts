import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

// Mirrors DTO/BusListDto.cs (BookingBusesController). One row per bus that has at least one
// future, bookable trip with free seats; the trip fields describe that bus's NEXT such trip.
export interface BrowseSeat {
  tripSeatId: string;
  seatId: string;
  seatNumber: string;
  seatType: string;
  fare: number;
  status: string;
  isAvailable: boolean;
  isHeld: boolean;
  isBooked: boolean;
  isBlocked: boolean;
  rowNumber: number;
  columnNumber: number;
  deckLevel: number;
  isWindow: boolean;
  extraFare: number | null;
  isActive: boolean;
}

export interface BrowseBus {
  id: string;
  brand: string | null;
  model: string | null;
  coachNumber: string;
  registrationNumber: string;
  busType: string;
  totalSeats: number;
  hasWifi: boolean;
  hasToilet: boolean;
  manufactureYear: number | null;
  primaryImageUrl: string | null;
  amenities: string[];
  tripId: string;
  tripCode: string;
  baseFare: number;
  currency: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  duration: string;
  tripStatus: string;
  reportingTimeUtc: string | null;
  departureTerminalId: string | null;
  departureTerminalName: string | null;
  departureCity: string | null;
  arrivalTerminalId: string | null;
  arrivalTerminalName: string | null;
  arrivalCity: string | null;
  scheduleId: string | null;
  scheduleCode: string | null;
  availableSeats: number;
  heldSeats: number;
  bookedSeats: number;
  blockedSeats: number;
  upcomingTripCount: number;
  rating: number | null;
  totalReviews: number;
  seats: BrowseSeat[] | null;
}

export interface BrowseTerminal {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
}

export interface BrowseFilter {
  from?: string;
  to?: string;
  date?: string;
}

/**
 * Public bus discovery (BookingBusesController is [AllowAnonymous]): browse the coaches that
 * are actually selling right now, independent of a route search. The unified route search
 * (features/search) remains the main booking path - this is the "what buses are running?" view
 * that came from the teammate's angular-app, rebuilt on this app's design system.
 */
@Injectable({ providedIn: 'root' })
export class BrowseApiService {
  private readonly api = inject(ApiService);

  buses(filter: BrowseFilter): Observable<{ buses: BrowseBus[]; totalCount: number }> {
    return this.api.get('booking-buses', { from: filter.from, to: filter.to, date: filter.date });
  }

  terminals(): Observable<{ departureTerminals: BrowseTerminal[]; arrivalTerminals: BrowseTerminal[] }> {
    return this.api.get('booking-buses/available-terminals');
  }

  bus(id: string): Observable<BrowseBus> {
    return this.api.get(`booking-buses/${id}`);
  }
}

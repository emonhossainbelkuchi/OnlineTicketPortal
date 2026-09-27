import { Component, computed, input, output, signal } from '@angular/core';

/** The minimum a seat needs to be drawn on the bus. TripSeat (trip page) and BrowseSeat (bus page) both fit. */
export interface BusSeatCell {
  id: string;
  seatNumber: string;
  seatType: string;
  fare: number;
  status: string;
  rowNumber?: number | null;
  columnNumber?: number | null;
  deckLevel?: number | null;
  isWindow?: boolean | null;
}

interface PlacedSeat {
  seat: BusSeatCell;
  row: number;
  col: number;
  deck: number;
}

interface DeckLayout {
  deck: number;
  label: string;
  /** Columns before the aisle (the aisle sits after this many seat columns; 0 = no aisle). */
  aisleAfter: number;
  columns: number;
  rows: { row: number; cells: (BusSeatCell | null)[] }[];
}

/** "4B" -> row 4, column 2. "B4" -> row 2, column 4 (letter = row). null when the number has no such pattern. */
function positionFromSeatNumber(seatNumber: string): { row: number; col: number } | null {
  const trimmed = seatNumber.trim();
  const numberFirst = /^(\d+)\s*([A-Za-z])$/.exec(trimmed);
  if (numberFirst) return { row: Number(numberFirst[1]), col: numberFirst[2].toUpperCase().charCodeAt(0) - 64 };
  const letterFirst = /^([A-Za-z])\s*(\d+)$/.exec(trimmed);
  if (letterFirst) return { row: letterFirst[1].toUpperCase().charCodeAt(0) - 64, col: Number(letterFirst[2]) };
  return null;
}

/**
 * Draws a coach the way you see it from above: the front (door + driver) at the TOP, seat rows
 * running DOWN the page, and an aisle between the left and right seat columns. Buses in
 * Bangladesh drive on the left, so the driver sits on the right and the door is on the left.
 *
 * Seat positions come from the API (rowNumber / columnNumber / deckLevel on each trip seat). If a
 * seat has none, the position is read from the seat number ("4B"); if that is not possible either,
 * seats are simply laid out four to a row in seat-number order, so a bus is never drawn as a
 * jumble. Double-deck coaches get a Lower / Upper deck switcher.
 *
 * Used in two modes: interactive (customer picks seats on the trip page) and readOnly (the bus
 * details page just shows availability).
 */
@Component({
  selector: 'tp-bus-seat-layout',
  standalone: true,
  template: `
    @if (showLegend()) {
      <div class="tp-bus-legend">
        <span><i class="tp-bus-legend__swatch tp-bus-seat--available"></i>Available</span>
        @if (!readOnly()) { <span><i class="tp-bus-legend__swatch tp-bus-seat--selected"></i>Selected</span> }
        <span><i class="tp-bus-legend__swatch tp-bus-seat--held"></i>Held</span>
        <span><i class="tp-bus-legend__swatch tp-bus-seat--booked"></i>Booked</span>
      </div>
    }

    @if (decks().length > 1) {
      <div class="tp-bus-decks" role="tablist" aria-label="Deck">
        @for (d of decks(); track d.deck; let i = $index) {
          <button type="button" role="tab" [attr.aria-selected]="i === activeIndex()" [class.tp-bus-decks__tab--active]="i === activeIndex()" (click)="activeDeck.set(i)">
            {{ d.label }}
          </button>
        }
      </div>
    }

    @if (visibleDeck(); as deck) {
      <div class="tp-bus">
        <div class="tp-bus__front">
          <span class="tp-bus__door">Door</span>
          <span class="tp-bus__driver" aria-label="Driver's seat">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              <path d="M12 14.2V21M9.9 10.9L3.4 9M14.1 10.9L20.6 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            Driver
          </span>
        </div>

        <div class="tp-bus__rows">
          @for (row of deck.rows; track row.row) {
            <div class="tp-bus__row">
              @for (cell of row.cells; track $index; let i = $index) {
                @if (deck.aisleAfter > 0 && i === deck.aisleAfter) { <span class="tp-bus__aisle" aria-hidden="true"></span> }
                @if (cell; as seat) {
                  <button
                    type="button"
                    class="tp-bus-seat"
                    [class]="'tp-bus-seat tp-bus-seat--' + stateOf(seat)"
                    [class.tp-bus-seat--window]="seat.isWindow"
                    [class.tp-bus-seat--right]="deck.aisleAfter > 0 && i >= deck.aisleAfter"
                    [class.tp-bus-seat--sleeper]="seat.seatType === 'Sleeper'"
                    [disabled]="!canToggle(seat)"
                    [attr.aria-pressed]="isSelected(seat)"
                    [attr.aria-label]="labelOf(seat)"
                    [title]="labelOf(seat)"
                    (click)="toggle.emit(seat.id)"
                  >{{ seat.seatNumber }}</button>
                } @else {
                  <span class="tp-bus-seat tp-bus-seat--gap" aria-hidden="true"></span>
                }
              }
            </div>
          }
        </div>

        <div class="tp-bus__rear">Rear</div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .tp-bus-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; margin-bottom: var(--tp-space-4); font-size: 13px; color: var(--tp-text-muted); }
    .tp-bus-legend span { display: inline-flex; align-items: center; gap: 6px; }
    .tp-bus-legend__swatch { width: 16px; height: 16px; border-radius: 5px; display: inline-block; border: 1.5px solid var(--tp-border); }

    .tp-bus-decks { display: flex; justify-content: center; gap: var(--tp-space-2); margin-bottom: var(--tp-space-4); }
    .tp-bus-decks button { border: 1px solid var(--tp-border); background: var(--tp-surface); color: var(--tp-text-muted); border-radius: var(--tp-radius-pill); padding: 6px 16px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .tp-bus-decks__tab--active { background: var(--tp-yellow-tint) !important; border-color: var(--tp-yellow-dark) !important; color: var(--tp-text-on-yellow) !important; }

    /* The coach body: rounded "nose" at the top, squarer rear at the bottom. */
    .tp-bus { width: fit-content; max-width: 100%; margin: 0 auto; padding: 14px 18px 12px; border: 2px solid var(--tp-border); border-radius: 56px 56px 18px 18px; background: linear-gradient(180deg, var(--tp-surface-alt), var(--tp-surface) 140px); box-shadow: var(--tp-shadow-card); overflow-x: auto; }
    .tp-bus__front { display: flex; align-items: center; justify-content: space-between; gap: var(--tp-space-4); padding: 4px 6px 12px; margin: 0 6px var(--tp-space-3); border-bottom: 2px dashed var(--tp-border); font-size: 12px; font-weight: 700; color: var(--tp-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .tp-bus__driver { display: inline-flex; align-items: center; gap: 6px; }
    .tp-bus__door { border: 1.5px solid var(--tp-border); border-radius: 6px; padding: 3px 8px; }
    .tp-bus__rows { display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .tp-bus__row { display: flex; align-items: center; gap: 8px; }
    .tp-bus__aisle { width: 26px; flex: none; }
    .tp-bus__rear { margin-top: var(--tp-space-3); padding-top: 8px; border-top: 2px dashed var(--tp-border); text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tp-text-muted); }

    .tp-bus-seat { width: 46px; height: 46px; flex: none; border-radius: 10px 10px 8px 8px; border: 1.5px solid var(--tp-border); background: var(--tp-surface); color: var(--tp-text); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; transition: transform var(--tp-transition-fast), border-color var(--tp-transition-fast); }
    .tp-bus-seat--sleeper { width: 58px; height: 52px; }
    .tp-bus-seat:not(:disabled):hover { transform: translateY(-1px); border-color: var(--tp-yellow-dark); }
    .tp-bus-seat:focus-visible { outline: 2px solid var(--tp-yellow-dark); outline-offset: 2px; }
    .tp-bus-seat:disabled { cursor: default; }
    /* A window seat gets a heavier outer edge - the side against the bus wall. */
    .tp-bus-seat--window { box-shadow: inset 3px 0 0 var(--tp-info); }
    .tp-bus-seat--window.tp-bus-seat--right { box-shadow: inset -3px 0 0 var(--tp-info); }
    .tp-bus-seat--available { background: var(--tp-surface); }
    .tp-bus-seat--selected { background: var(--tp-yellow); border-color: var(--tp-yellow-dark); color: var(--tp-text-on-yellow); }
    .tp-bus-seat--held { background: var(--tp-warning-tint); border-color: var(--tp-warning); color: var(--tp-warning); }
    .tp-bus-seat--booked { background: var(--tp-surface-alt); color: var(--tp-text-muted); text-decoration: line-through; }
    .tp-bus-seat--blocked { background: var(--tp-danger-tint); border-color: var(--tp-danger); color: var(--tp-danger); text-decoration: line-through; }
    .tp-bus-seat--gap { visibility: hidden; }
  `],
})
export class BusSeatLayoutComponent {
  readonly seats = input.required<BusSeatCell[]>();
  readonly selectedIds = input<readonly string[]>([]);
  readonly currency = input('BDT');
  readonly readOnly = input(false);
  readonly showLegend = input(true);
  /** Emits the id of the seat the customer clicked (select or deselect). */
  readonly toggle = output<string>();

  protected readonly activeDeck = signal(0);
  protected readonly activeIndex = computed(() => Math.min(this.activeDeck(), Math.max(0, this.decks().length - 1)));

  protected readonly decks = computed<DeckLayout[]>(() => {
    const seats = this.seats();
    if (seats.length === 0) return [];

    const placed = this.place(seats);
    const byDeck = new Map<number, PlacedSeat[]>();
    for (const p of placed) {
      const list = byDeck.get(p.deck) ?? [];
      list.push(p);
      byDeck.set(p.deck, list);
    }

    const deckNumbers = [...byDeck.keys()].sort((a, b) => a - b);
    return deckNumbers.map((deck, index) => {
      const inDeck = byDeck.get(deck) ?? [];
      const columns = Math.max(...inDeck.map((p) => p.col));
      const rowNumbers = [...new Set(inDeck.map((p) => p.row))].sort((a, b) => a - b);
      const rows = rowNumbers.map((row) => {
        const cells: (BusSeatCell | null)[] = Array.from({ length: columns }, () => null);
        for (const p of inDeck.filter((x) => x.row === row)) cells[p.col - 1] = p.seat;
        return { row, cells };
      });
      return {
        deck,
        label: deckNumbers.length > 1 ? (index === 0 ? 'Lower deck' : 'Upper deck') : 'Main deck',
        columns,
        // 4 columns -> 2 | 2, 3 -> 2 | 1, 2 -> 1 | 1, 5 -> 3 | 2, 1 -> no aisle.
        aisleAfter: columns >= 2 ? Math.ceil(columns / 2) : 0,
        rows,
      };
    });
  });

  protected readonly visibleDeck = computed(() => this.decks()[this.activeIndex()] ?? null);

  protected isSelected(seat: BusSeatCell): boolean {
    return this.selectedIds().includes(seat.id);
  }

  protected stateOf(seat: BusSeatCell): 'available' | 'selected' | 'held' | 'booked' | 'blocked' {
    if (this.isSelected(seat)) return 'selected';
    switch (seat.status) {
      case 'Available': return 'available';
      case 'Held': return 'held';
      case 'Blocked': return 'blocked';
      default: return 'booked'; // Booked, Cancelled, anything unknown: not for sale
    }
  }

  protected canToggle(seat: BusSeatCell): boolean {
    return !this.readOnly() && (seat.status === 'Available' || this.isSelected(seat));
  }

  protected labelOf(seat: BusSeatCell): string {
    const state = this.stateOf(seat);
    const kind = seat.seatType ? `${seat.seatType} seat` : 'Seat';
    return `${kind} ${seat.seatNumber} - ${state === 'available' ? 'available' : state} - ${this.currency()} ${seat.fare}`;
  }

  /**
   * Row/column from the API when present, otherwise from the seat number, otherwise four to a row in
   * seat-number order. All-or-nothing on purpose: mixing API positions with guessed ones on the same
   * bus could put two seats in one cell.
   */
  private place(seats: BusSeatCell[]): PlacedSeat[] {
    const fromApi = seats.every((s) => (s.rowNumber ?? 0) > 0 && (s.columnNumber ?? 0) > 0);
    if (fromApi) {
      const placed = seats.map((seat) => ({ seat, row: seat.rowNumber as number, col: seat.columnNumber as number, deck: seat.deckLevel || 1 }));
      if (!BusSeatLayoutComponent.collides(placed)) return placed;
    }

    const parsed = seats.map((seat) => ({ seat, pos: positionFromSeatNumber(seat.seatNumber) }));
    if (parsed.every((p) => p.pos)) {
      const placed = parsed.map(({ seat, pos }) => ({ seat, row: (pos as { row: number }).row, col: (pos as { col: number }).col, deck: seat.deckLevel || 1 }));
      if (!BusSeatLayoutComponent.collides(placed)) return placed;
    }

    const ordered = [...seats].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));
    return ordered.map((seat, i) => ({ seat, row: Math.floor(i / 4) + 1, col: (i % 4) + 1, deck: 1 }));
  }

  /** Two seats claiming the same deck/row/column means the positions cannot be trusted. */
  private static collides(placed: PlacedSeat[]): boolean {
    return new Set(placed.map((p) => `${p.deck}:${p.row}:${p.col}`)).size !== placed.length;
  }
}

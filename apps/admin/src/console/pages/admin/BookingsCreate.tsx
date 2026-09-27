import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  createBooking,
  createSeatHold,
  releaseSeatHold,
  getAllTripsLite,
  getAllSalesCounters,
  getAllTerminals,
  getCurrentUserRole,
  formatMoney,
  extractErrorMessage,
} from '@/services/bookingService';
import type {
  TripLite,
  TripSeatLite,
  SalesCounterLite,
  SeatHoldLite,
  BookingPassengerCreateDto,
  Gender,
  PassengerType,
} from '@/types/booking.types';
import type { TerminalResponseDto } from '@/services/terminalService';

const GENDERS: Gender[] = ['Unknown', 'Male', 'Female', 'Other'];
const PASSENGER_TYPES: PassengerType[] = ['Adult', 'Child', 'Senior', 'Student'];

const emptyPassenger = (): BookingPassengerCreateDto => ({
  fullName: '', phone: '', email: '', gender: 'Unknown', passengerType: 'Adult', age: null, nationalIdNumber: '',
});

export const BookingsCreate: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';
  const canCounterSale = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [trips, setTrips] = useState<TripLite[]>([]);
  const [terminals, setTerminals] = useState<TerminalResponseDto[]>([]);
  const [salesCounters, setSalesCounters] = useState<SalesCounterLite[]>([]);
  const [loadingPrereqs, setLoadingPrereqs] = useState(true);

  const [tripId, setTripId] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [hold, setHold] = useState<SeatHoldLite | null>(null);
  const [holdingBusy, setHoldingBusy] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  const [boardingTerminalId, setBoardingTerminalId] = useState('');
  const [droppingTerminalId, setDroppingTerminalId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isCounterSale, setIsCounterSale] = useState(false);
  const [salesCounterId, setSalesCounterId] = useState('');
  const [passengers, setPassengers] = useState<BookingPassengerCreateDto[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [tripList, termList, counters] = await Promise.all([
          getAllTripsLite(), getAllTerminals(), getAllSalesCounters(),
        ]);
        setTrips(tripList);
        setTerminals(termList);
        setSalesCounters(counters);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoadingPrereqs(false);
      }
    })();
  }, []);

  // Releasing a stale hold if the user changes trip / seats before submitting.
  useEffect(() => {
    return () => {
      if (hold && hold.status === 'Active') {
        releaseSeatHold(hold.id).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold?.id]);

  const trip = trips.find((t) => t.id === tripId);
  const availableSeats: TripSeatLite[] = useMemo(
    () => (trip?.tripSeats || []).filter((s) => s.status === 'Available'),
    [trip]
  );

  const filteredCounters = salesCounters.filter(
    (c) => !trip || c.busOperatorId === trip.busOperatorId
  );

  const handleTripChange = (id: string) => {
    setTripId(id);
    setSelectedSeatIds([]);
    setHold(null);
    setHoldError(null);
    const t = trips.find((x) => x.id === id);
    if (t) {
      setBoardingTerminalId(t.departureTerminalId);
      setDroppingTerminalId(t.arrivalTerminalId);
    }
  };

  const toggleSeat = (seatId: string) => {
    if (hold) return; // seats locked once held
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const handleHoldSeats = async () => {
    if (!tripId || selectedSeatIds.length === 0) return;
    setHoldingBusy(true);
    setHoldError(null);
    try {
      const created = await createSeatHold(tripId, selectedSeatIds);
      setHold(created);
      setPassengers(Array.from({ length: created.items.length }, () => emptyPassenger()));
    } catch (err) {
      setHoldError(extractErrorMessage(err));
    } finally {
      setHoldingBusy(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!hold) return;
    try {
      await releaseSeatHold(hold.id);
    } catch {}
    setHold(null);
    setPassengers([]);
  };

  const updatePassenger = (idx: number, patch: Partial<BookingPassengerCreateDto>) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const subTotal = hold ? hold.items.reduce((sum, i) => sum + i.fareAtHold, 0) : 0;

  const validate = (): string | null => {
    if (!tripId) return 'Select a Trip first.';
    if (!hold) return 'Hold at least one seat before submitting.';
    if (!boardingTerminalId || !droppingTerminalId) return 'Boarding and Dropping terminals are required.';
    if (!contactName.trim()) return 'Contact name is required.';
    if (!contactPhone.trim()) return 'Contact phone is required.';
    if (passengers.length !== hold.items.length) return 'Passenger count must match held seats.';
    if (passengers.some((p) => !p.fullName.trim())) return 'Every passenger needs a full name.';
    if (isCounterSale && !salesCounterId) return 'Select a Sales Counter for a counter sale.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!hold) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createBooking({
        tripId,
        holdToken: hold.holdToken,
        boardingTerminalId,
        droppingTerminalId,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || null,
        salesCounterId: isCounterSale ? salesCounterId : null,
        passengers: passengers.map((p) => ({
          ...p,
          phone: p.phone?.trim() || null,
          email: p.email?.trim() || null,
          nationalIdNumber: p.nationalIdNumber?.trim() || null,
          age: p.age ? Number(p.age) : null,
        })),
      });
      setHold(null); // already converted server-side; skip the release-on-unmount effect
      navigate(`/admin/bookings/${created.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/bookings" className="hover:text-blue-600">Bookings</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Create</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-ticket text-blue-600" />
            New Booking
          </h1>
        </div>
        <Link to="/admin/bookings" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
          <i className="fa-solid fa-arrow-left" />
          <span>Back to Bookings</span>
        </Link>
      </div>

      {!canWrite && (
        <div className="alert alert-warning d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <div>Only Admin, Staff or Operator roles can create bookings. Currently simulating <strong>{currentRole}</strong>.</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Trip + seats */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, lineHeight: '14px' }}>1</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Trip &amp; Seats</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Trip *</label>
            <select
              value={tripId}
              onChange={(e) => handleTripChange(e.target.value)}
              disabled={!canWrite || loadingPrereqs || !!hold}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-900"
            >
              <option value="">-- Select a Trip --</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tripCode} · {new Date(t.departureTimeUtc).toLocaleString()} · {t.currency} {t.baseFare}
                </option>
              ))}
            </select>
          </div>

          {trip && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  <i className="fa-solid fa-chair text-slate-400 me-1.5" />
                  Available Seats ({availableSeats.length})
                </span>
                {!hold ? (
                  <button
                    type="button"
                    onClick={handleHoldSeats}
                    disabled={selectedSeatIds.length === 0 || holdingBusy || !canWrite}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <i className={`fa-solid ${holdingBusy ? 'fa-circle-notch fa-spin' : 'fa-lock'}`} />
                    <span>{holdingBusy ? 'Holding...' : `Hold ${selectedSeatIds.length || ''} Seat(s)`}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReleaseHold}
                    className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-lock-open" />
                    <span>Release Hold</span>
                  </button>
                )}
              </div>

              {holdError && <div className="text-[11px] text-rose-600">{holdError}</div>}

              <div className="d-flex flex-wrap gap-2">
                {availableSeats.map((s) => {
                  const selected = selectedSeatIds.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSeat(s.id)}
                      disabled={!!hold}
                      className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                      <i className="fa-solid fa-chair me-1" />
                      {s.seatNumber} <span className="opacity-75">({s.seatType})</span>
                    </button>
                  );
                })}
                {availableSeats.length === 0 && (
                  <span className="text-[11px] text-slate-500">No available seats on this trip.</span>
                )}
              </div>

              {hold && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between gap-2">
                  <span>
                    <i className="fa-solid fa-lock me-1.5" />
                    Held {hold.items.length} seat(s) · Frozen SubTotal: <strong>{formatMoney(subTotal, trip.currency)}</strong> ·
                    Expires {new Date(hold.holdExpiresAtUtc).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Trip details */}
        <div className={`bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4 ${!hold ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, lineHeight: '14px' }}>2</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Trip Details &amp; Contact</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Boarding Terminal *</label>
              <select value={boardingTerminalId} onChange={(e) => setBoardingTerminalId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <option value="">-- Select --</option>
                {terminals.map((t) => <option key={t.id} value={t.id}>{t.city} – {t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Dropping Terminal *</label>
              <select value={droppingTerminalId} onChange={(e) => setDroppingTerminalId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <option value="">-- Select --</option>
                {terminals.map((t) => <option key={t.id} value={t.id}>{t.city} – {t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Name *</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Phone *</label>
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>

          {canCounterSale && (
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isCounterSale} onChange={(e) => setIsCounterSale(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-xs text-slate-800 font-medium">This is a cash counter sale (walk-in customer)</span>
              </label>
              {isCounterSale && (
                <select value={salesCounterId} onChange={(e) => setSalesCounterId(e.target.value)} className="w-full max-w-sm text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <option value="">-- Select Sales Counter --</option>
                  {filteredCounters.map((c) => <option key={c.id} value={c.id}>{c.counterName} ({c.counterCode})</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Passengers */}
        <div className={`bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4 ${!hold ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="badge bg-primary rounded-circle" style={{ width: 22, height: 22, lineHeight: '14px' }}>3</span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Passengers ({passengers.length}) — one per held seat
            </span>
          </div>

          {passengers.map((p, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Full Name *</label>
                <input value={p.fullName} onChange={(e) => updatePassenger(idx, { fullName: e.target.value })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Gender</label>
                <select value={p.gender} onChange={(e) => updatePassenger(idx, { gender: e.target.value as Gender })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Type</label>
                <select value={p.passengerType} onChange={(e) => updatePassenger(idx, { passengerType: e.target.value as PassengerType })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                  {PASSENGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Age</label>
                <input type="number" min="0" value={p.age ?? ''} onChange={(e) => updatePassenger(idx, { age: e.target.value ? Number(e.target.value) : null })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Phone</label>
                <input value={p.phone || ''} onChange={(e) => updatePassenger(idx, { phone: e.target.value })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Email</label>
                <input value={p.email || ''} onChange={(e) => updatePassenger(idx, { email: e.target.value })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">National ID Number</label>
                <input value={p.nationalIdNumber || ''} onChange={(e) => updatePassenger(idx, { nationalIdNumber: e.target.value })} className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
          {passengers.length === 0 && (
            <p className="text-[11px] text-slate-500">Hold seats above to unlock passenger fields.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/admin/bookings" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !canWrite || !hold}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
            <span>{submitting ? 'Creating Booking...' : 'Create Booking'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingsCreate;

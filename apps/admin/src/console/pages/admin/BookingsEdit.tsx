import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  getBookingById,
  updateBooking,
  deleteBooking,
  getAllTerminals,
  getCurrentUserRole,
  extractErrorMessage,
} from '@/services/bookingService';
import type { BookingResponseDto, BookingPassengerCreateDto, Gender, PassengerType } from '@/types/booking.types';
import type { TerminalResponseDto } from '@/services/terminalService';

const GENDERS: Gender[] = ['Unknown', 'Male', 'Female', 'Other'];
const PASSENGER_TYPES: PassengerType[] = ['Adult', 'Child', 'Senior', 'Student'];

export const BookingsEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState(false);
  const [locked, setLocked] = useState(false);

  const [terminals, setTerminals] = useState<TerminalResponseDto[]>([]);
  const [pnr, setPnr] = useState('');
  const [boardingTerminalId, setBoardingTerminalId] = useState('');
  const [droppingTerminalId, setDroppingTerminalId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [passengers, setPassengers] = useState<BookingPassengerCreateDto[]>([]);
  const [rowVersion, setRowVersion] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setConflictError(false);
    try {
      const termList = await getAllTerminals();
      setTerminals(termList);

      const b: BookingResponseDto = await getBookingById(id);
      setPnr(b.pnr);
      setBoardingTerminalId(b.boardingTerminalId);
      setDroppingTerminalId(b.droppingTerminalId);
      setContactName(b.contactName);
      setContactPhone(b.contactPhone);
      setContactEmail(b.contactEmail || '');
      setPassengers(b.passengers.map((p) => ({
        fullName: p.fullName, phone: p.phone, email: p.email,
        gender: p.gender, passengerType: p.passengerType, age: p.age, nationalIdNumber: p.nationalIdNumber,
      })));
      setRowVersion(b.rowVersion);
      setLocked(b.status !== 'Draft' && b.status !== 'PendingPayment');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const updatePassenger = (idx: number, patch: Partial<BookingPassengerCreateDto>) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setError(null);
    setConflictError(false);
    try {
      const updated = await updateBooking(id, {
        boardingTerminalId,
        droppingTerminalId,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || null,
        passengers,
        rowVersion,
      });
      navigate(`/admin/bookings/${updated.id}`);
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('changed by another')) {
        setConflictError(true);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteBooking(id);
      navigate('/admin/bookings');
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-blue-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading booking for editing...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/bookings" className="hover:text-blue-600">Bookings</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium font-mono">{pnr}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-ticket text-blue-600" />
            Edit Booking: {pnr}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/admin/bookings/${id}`} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
            <i className="fa-solid fa-arrow-up-right-from-square" /> <span>View</span>
          </Link>
          <Link to="/admin/bookings" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
            <i className="fa-solid fa-arrow-left" /> <span>Cancel</span>
          </Link>
        </div>
      </div>

      {locked && (
        <div className="alert alert-warning d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-lock mt-0.5" />
          <div>This booking is locked for direct editing — status and pricing only change through payment confirmation or the cancellation flow.</div>
        </div>
      )}

      {conflictError && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between gap-3 text-xs mb-0">
          <div className="d-flex align-items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
            <div>
              <strong>409 Conflict:</strong> This Booking was modified by another request since you loaded it.
              Reload the latest data to avoid overwriting changes.
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn btn-sm btn-warning">Reload Latest</button>
        </div>
      )}

      {error && !conflictError && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <fieldset disabled={locked || !canWrite}>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Boarding Terminal *</label>
              <select value={boardingTerminalId} onChange={(e) => setBoardingTerminalId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                {terminals.map((t) => <option key={t.id} value={t.id}>{t.city} – {t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Dropping Terminal *</label>
              <select value={droppingTerminalId} onChange={(e) => setDroppingTerminalId(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                {terminals.map((t) => <option key={t.id} value={t.id}>{t.city} – {t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Name *</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Phone *</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Email</label>
              <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Passengers ({passengers.length}) — count is fixed by the held seats
            </span>
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
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-500 font-mono">
            RowVersion Token: <code className="text-indigo-700 font-bold">{rowVersion}</code>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className="fa-solid fa-trash" /> <span>Delete Booking</span>
            </button>
            <div className="flex items-center gap-2">
              <Link to="/admin/bookings" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </fieldset>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Booking</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete booking <strong>{pnr}</strong>?</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleDelete} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsEdit;

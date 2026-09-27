import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBookingById,
  deleteBooking,
  uploadPassengerIdPhoto,
  getCurrentUserRole,
  formatMoney,
  bookingStatusBadgeClass,
  bookingStatusIcon,
  extractErrorMessage,
} from '@/services/bookingService';
import type { BookingResponseDto } from '@/types/booking.types';

export const BookingsDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [booking, setBooking] = useState<BookingResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingPassengerId = useRef<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const b = await getBookingById(id);
      setBooking(b);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const triggerUpload = (passengerId: string) => {
    pendingPassengerId.current = passengerId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const passengerId = pendingPassengerId.current;
    e.target.value = '';
    if (!file || !passengerId || !booking) return;
    setUploadingFor(passengerId);
    try {
      await uploadPassengerIdPhoto(booking.id, passengerId, file);
      await load();
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setUploadingFor(null);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    try {
      await deleteBooking(booking.id);
      window.location.href = '/admin/bookings';
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-blue-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading booking details...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="alert alert-danger text-xs">{error || 'Booking not found.'}</div>
        <Link to="/admin/bookings" className="text-xs text-blue-600">&larr; Back to Bookings</Link>
      </div>
    );
  }

  const editable = booking.status === 'Draft' || booking.status === 'PendingPayment';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <input type="file" accept="image/*" ref={fileInputRef} className="d-none" onChange={handleFileSelected} />

      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/bookings" className="hover:text-blue-600">Bookings</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium font-mono">{booking.pnr}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {booking.pnr}
            </span>
            <span className={`badge ${bookingStatusBadgeClass(booking.status)}`}>
              <i className={`${bookingStatusIcon(booking.status)} me-1`} />
              {booking.status}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-arrows-rotate" /> Refresh
          </button>
          <Link to="/admin/bookings" className="px-3 py-1.5 border rounded-lg text-xs font-medium">All Bookings</Link>
          {canWrite && editable && (
            <Link to={`/admin/bookings/edit/${booking.id}`} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
              <i className="fa-solid fa-pen" /> <span>Edit</span>
            </Link>
          )}
          {canWrite && (
            <button type="button" onClick={() => setShowDeleteModal(true)} className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1">
              <i className="fa-solid fa-trash" /> <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] font-mono text-blue-300 font-bold uppercase">Contact</span>
          <div className="text-sm font-bold">{booking.contactName}</div>
          <div className="text-xs text-slate-300">{booking.contactPhone}{booking.contactEmail ? ` · ${booking.contactEmail}` : ''}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Channel</span>
          <div className="text-sm font-bold">{booking.saleChannel}</div>
          <div className="text-xs text-slate-300">Source: {booking.source} · Collected by: {booking.moneyCollectedBy}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase">Grand Total</span>
          <div className="text-sm font-bold">{formatMoney(booking.grandTotal, booking.currency)}</div>
          <div className="text-xs text-slate-300">Sub {formatMoney(booking.subTotal, booking.currency)} · Tax {formatMoney(booking.taxAmount, booking.currency)}</div>
        </div>
        <div>
          <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">Created</span>
          <div className="text-sm font-bold">{new Date(booking.createdAtUtc).toLocaleString()}</div>
          {booking.expiresAtUtc && <div className="text-xs text-slate-300">Expires {new Date(booking.expiresAtUtc).toLocaleString()}</div>}
        </div>
      </div>

      {/* Pricing breakdown */}
      <div className="bg-white border rounded-xl p-5 shadow-xs">
        <div className="text-xs font-bold text-slate-900 mb-3">Pricing Breakdown</div>
        <table className="table table-sm text-xs mb-0">
          <tbody>
            <tr><td>Sub Total</td><td className="text-end">{formatMoney(booking.subTotal, booking.currency)}</td></tr>
            <tr><td>Discount</td><td className="text-end">-{formatMoney(booking.discountAmount, booking.currency)}</td></tr>
            <tr><td>Tax</td><td className="text-end">{formatMoney(booking.taxAmount, booking.currency)}</td></tr>
            <tr><td>Service Charge</td><td className="text-end">{formatMoney(booking.serviceChargeAmount, booking.currency)}</td></tr>
            <tr className="fw-bold border-top"><td>Grand Total</td><td className="text-end">{formatMoney(booking.grandTotal, booking.currency)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Passengers */}
      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">Passengers ({booking.passengers.length})</div>
        <div className="overflow-x-auto">
          <table className="table table-sm text-xs align-middle mb-0">
            <thead>
              <tr className="text-slate-500">
                <th>Name</th><th>Gender</th><th>Type</th><th>Age</th><th>Phone</th><th>National ID</th><th>ID Photo</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p) => (
                <tr key={p.id}>
                  <td className="fw-semibold">{p.fullName}</td>
                  <td>{p.gender}</td>
                  <td>{p.passengerType}</td>
                  <td>{p.age ?? '—'}</td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.nationalIdNumber || '—'}</td>
                  <td>
                    {p.nationalIdPhotoUrl ? (
                      <a href={p.nationalIdPhotoUrl} target="_blank" rel="noreferrer" className="text-blue-600">
                        <i className="fa-solid fa-image me-1" />View
                      </a>
                    ) : canWrite ? (
                      <button
                        type="button"
                        onClick={() => triggerUpload(p.id)}
                        disabled={uploadingFor === p.id}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        <i className={`fa-solid ${uploadingFor === p.id ? 'fa-circle-notch fa-spin' : 'fa-upload'} me-1`} />
                        Upload
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw DTO */}
      <div className="bg-white border rounded-xl p-5 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-900">API Response DTO (BookingResponseDto)</div>
        <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
          {JSON.stringify(booking, null, 2)}
        </pre>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Booking</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete booking <strong>{booking.pnr}</strong>?</p>
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

export default BookingsDetails;

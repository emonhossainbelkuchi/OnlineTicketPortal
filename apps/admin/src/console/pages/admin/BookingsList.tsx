import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAllBookings,
  deleteBooking,
  subscribeToBookings,
  getCurrentUserRole,
  formatMoney,
  bookingStatusBadgeClass,
  bookingStatusIcon,
  extractErrorMessage,
} from '@/services/bookingService';
import type { BookingResponseDto, BookingStatus } from '@/types/booking.types';

const STATUS_OPTIONS: (BookingStatus | 'ALL')[] = [
  'ALL', 'Draft', 'PendingPayment', 'Confirmed', 'Completed',
  'PartiallyCancelled', 'Cancelled', 'Expired', 'Failed', 'Refunded',
];

const POLL_INTERVAL_MS = 10000;

export const BookingsList: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin' || currentRole === 'Staff' || currentRole === 'Operator';

  const [bookings, setBookings] = useState<BookingResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [deleteCandidate, setDeleteCandidate] = useState<BookingResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pollRef = useRef<number | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getAllBookings();
      setBookings(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Live updates: instant refetch when a booking changes in this tab / another
    // tab / the public booking frontend (same backend, so a simple poll catches it).
    const unsubscribe = subscribeToBookings(() => loadData(true));

    pollRef.current = window.setInterval(() => loadData(true), POLL_INTERVAL_MS);
    const onFocus = () => loadData(true);
    window.addEventListener('focus', onFocus);

    return () => {
      unsubscribe();
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            b.pnr.toLowerCase().includes(q) ||
            b.contactName.toLowerCase().includes(q) ||
            b.contactPhone.toLowerCase().includes(q) ||
            (b.contactEmail || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
  }, [bookings, searchQuery, statusFilter]);

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deleteBooking(deleteCandidate.id);
      setDeleteCandidate(null);
      await loadData(true);
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Bookings</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <i className="fa-solid fa-ticket text-sm" />
            </div>
            Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 badge bg-success-subtle text-success border border-success">
              <span className="d-inline-block rounded-circle bg-success" style={{ width: 6, height: 6 }} />
              Live
            </span>
            <span>
              Synced with every booking made here or on the public site
              {lastSyncedAt ? ` · last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadData()}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Refresh now"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          {canWrite ? (
            <Link
              to="/admin/bookings/create"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <i className="fa-solid fa-plus" />
              <span>New Booking</span>
            </Link>
          ) : (
            <button disabled className="px-3.5 py-2 bg-slate-200 text-slate-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed">
              <i className="fa-solid fa-plus" />
              <span>New Booking</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0" role="alert">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass text-slate-400 absolute left-3 top-2.5 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PNR, contact name, phone, or email..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
          className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin me-2" /> Loading bookings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-32">PNR</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 w-28">Channel</th>
                  <th className="py-3 px-4 w-24">Passengers</th>
                  <th className="py-3 px-4 w-28">Grand Total</th>
                  <th className="py-3 px-4 w-36">Status</th>
                  <th className="py-3 px-4 w-32">Created</th>
                  <th className="py-3 px-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/admin/bookings/${b.id}`)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80">
                        {b.pnr}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600">{b.contactName}</div>
                      <div className="text-[11px] text-slate-500">{b.contactPhone}{b.contactEmail ? ` · ${b.contactEmail}` : ''}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="badge bg-light text-dark border">{b.saleChannel}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <i className="fa-solid fa-user-group text-slate-400 me-1.5" />
                      {b.passengers?.length ?? 0}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {formatMoney(b.grandTotal, b.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`badge ${bookingStatusBadgeClass(b.status)}`}>
                        <i className={`${bookingStatusIcon(b.status)} me-1`} />
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500">
                      {new Date(b.createdAtUtc).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Link to={`/admin/bookings/${b.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded" title="View">
                          <i className="fa-solid fa-eye" />
                        </Link>
                        {canWrite && (b.status === 'Draft' || b.status === 'PendingPayment') && (
                          <Link to={`/admin/bookings/edit/${b.id}`} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded" title="Edit">
                            <i className="fa-solid fa-pen" />
                          </Link>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(b)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Booking</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete booking <strong>{deleteCandidate.pnr}</strong> ({deleteCandidate.contactName})?
              Related payments/tickets may block this if they still reference it.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setDeleteCandidate(null)} className="px-3 py-1.5 border rounded-lg text-xs">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;

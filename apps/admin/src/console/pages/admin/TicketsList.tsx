// src/pages/admin/TicketsList.tsx
//
// Read-only list, matching the backend (TicketsController has no Create/Edit).
// Search + status filter + pagination + auto-refresh (polling), Bootstrap +
// Font Awesome — same visual language as BookingsList.tsx / BusesList.tsx.
//
// No "New Ticket" button on purpose: tickets are only ever created by
// PaymentConfirmationService when an online payment is confirmed.

import { Link } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import {
  TicketStatus,
  TicketStatusBadgeClass,
  TicketStatusLabel,
} from '../../types/ticket.types';

const STATUS_OPTIONS: Array<{ value: TicketStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: TicketStatus.PendingPayment, label: TicketStatusLabel[TicketStatus.PendingPayment] },
  { value: TicketStatus.Issued, label: TicketStatusLabel[TicketStatus.Issued] },
  { value: TicketStatus.CheckedIn, label: TicketStatusLabel[TicketStatus.CheckedIn] },
  { value: TicketStatus.Used, label: TicketStatusLabel[TicketStatus.Used] },
  { value: TicketStatus.Cancelled, label: TicketStatusLabel[TicketStatus.Cancelled] },
  { value: TicketStatus.Refunded, label: TicketStatusLabel[TicketStatus.Refunded] },
  { value: TicketStatus.NoShow, label: TicketStatusLabel[TicketStatus.NoShow] },
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function TicketsList() {
  const {
    tickets,
    filteredCount,
    allCount,
    loading,
    error,
    refresh,
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    totalPages,
  } = useTickets({ live: true, pageSize: 10 });

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">
          <i className="fa-solid fa-ticket me-2" />
          Tickets
        </h3>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => refresh()} disabled={loading}>
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''} me-1`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-3">
        <div className="col-12 col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by ticket number, seat, or external key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-12 col-md-4">
          <select
            className="form-select"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value === 'all' ? 'all' : (Number(e.target.value) as TicketStatus))
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-2 d-flex align-items-center text-muted small">
          {filteredCount} of {allCount} tickets
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {error}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Ticket #</th>
              <th>Seat</th>
              <th>Status</th>
              <th className="text-end">Fare</th>
              <th className="text-end">Final Fare</th>
              <th>Issued</th>
              <th>Checked In</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  <i className="fa-solid fa-spinner fa-spin me-2" />
                  Loading tickets...
                </td>
              </tr>
            )}

            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  <i className="fa-regular fa-face-frown me-2" />
                  No tickets found.
                </td>
              </tr>
            )}

            {!loading &&
              tickets.map((t) => (
                <tr key={t.id}>
                  <td className="fw-semibold">{t.ticketNumber}</td>
                  <td>{t.seatNumberSnapshot}</td>
                  <td>
                    <span className={`badge ${TicketStatusBadgeClass[t.status]}`}>
                      {TicketStatusLabel[t.status]}
                    </span>
                  </td>
                  <td className="text-end">{t.fare.toFixed(2)}</td>
                  <td className="text-end">{t.finalFare.toFixed(2)}</td>
                  <td>{formatDate(t.issuedAtUtc)}</td>
                  <td>{formatDate(t.checkedInAtUtc)}</td>
                  <td className="text-end">
                    <Link to={`/admin/resource/Tickets/${t.id}`} className="btn btn-sm btn-outline-primary">
                      <i className="fa-solid fa-eye me-1" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Tickets pagination">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page - 1)}>
                <i className="fa-solid fa-chevron-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(page + 1)}>
                <i className="fa-solid fa-chevron-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

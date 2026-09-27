// src/pages/admin/TicketsDetails.tsx
//
// Read-only detail view for one ticket (GET /api/Tickets/{id}). No edit form —
// every field here only ever changes as a side effect of the payment,
// check-in, or cancellation workflows, never a raw PUT.

import { Link, useParams } from 'react-router-dom';
import { useTicket } from '../../hooks/useTickets';
import { TicketStatusBadgeClass, TicketStatusLabel } from '../../types/ticket.types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col-12 col-md-6 mb-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{children}</div>
    </div>
  );
}

export default function TicketsDetails() {
  const { id } = useParams<{ id: string }>();
  const { ticket, loading, error, notFound, forbidden, refresh } = useTicket(id, { live: true });

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <i className="fa-solid fa-spinner fa-spin fa-2x text-primary" />
        <div className="mt-2 text-muted">Loading ticket...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-warning">
          <i className="fa-solid fa-circle-question me-2" />
          Ticket not found.
        </div>
        <Link to="/admin/resource/Tickets" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to Tickets
        </Link>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-lock me-2" />
          You don't have access to this ticket.
        </div>
        <Link to="/admin/resource/Tickets" className="btn btn-outline-secondary">
          <i className="fa-solid fa-arrow-left me-1" /> Back to Tickets
        </Link>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          {error ?? 'Failed to load ticket.'}
        </div>
        <button className="btn btn-outline-secondary" onClick={() => refresh()}>
          <i className="fa-solid fa-rotate me-1" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin/resource/Tickets" className="text-decoration-none text-muted small">
            <i className="fa-solid fa-arrow-left me-1" /> Back to Tickets
          </Link>
          <h3 className="mb-0 mt-1">
            <i className="fa-solid fa-ticket me-2" />
            Ticket {ticket.ticketNumber}
          </h3>
        </div>
        <span className={`badge fs-6 ${TicketStatusBadgeClass[ticket.status]}`}>
          {TicketStatusLabel[ticket.status]}
        </span>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-circle-info me-2" />
          Ticket Info
        </div>
        <div className="card-body row">
          <Field label="Ticket Number">{ticket.ticketNumber}</Field>
          <Field label="External Ticket Key">{ticket.externalTicketKey ?? '—'}</Field>
          <Field label="Seat Number">{ticket.seatNumberSnapshot}</Field>
          <Field label="Booking ID">
            <Link to={`/admin/resource/Bookings/${ticket.bookingId}`}>{ticket.bookingId}</Link>
          </Field>
          <Field label="Trip ID">{ticket.tripId}</Field>
          <Field label="Trip Seat ID">{ticket.tripSeatId}</Field>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-solid fa-money-bill me-2" />
          Fare
        </div>
        <div className="card-body row">
          <Field label="Fare">{ticket.fare.toFixed(2)}</Field>
          <Field label="Discount Amount">{ticket.discountAmount.toFixed(2)}</Field>
          <Field label="Final Fare">{ticket.finalFare.toFixed(2)}</Field>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-header bg-light">
          <i className="fa-regular fa-clock me-2" />
          Timeline
        </div>
        <div className="card-body row">
          <Field label="Issued At">{formatDate(ticket.issuedAtUtc)}</Field>
          <Field label="Checked In At">{formatDate(ticket.checkedInAtUtc)}</Field>
          <Field label="Cancelled At">{formatDate(ticket.cancelledAtUtc)}</Field>
          <Field label="Created At">{formatDate(ticket.createdAtUtc)}</Field>
          <Field label="Updated At">{formatDate(ticket.updatedAtUtc)}</Field>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <i className="fa-solid fa-qrcode me-2" />
          QR Code Payload
        </div>
        <div className="card-body">
          <code className="d-block text-break">{ticket.qrCodePayload}</code>
        </div>
      </div>
    </div>
  );
}

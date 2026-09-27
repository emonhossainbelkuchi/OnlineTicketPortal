// Chunk 8 — a small standalone server standing in for Hanif's own ERP. Implements the four
// calls documented in docs/EXTERNAL_ERP_INTEGRATION_CONTRACT.md, so
// apps/api/Services/ExternalBookingSyncService.cs has something real to point at in dev/demo
// instead of a fictional https://erp.hanifenterprise.example.com URL that was never reachable.
//
// Run it:   node apps/mock-erp/src/index.js   (or `npm start` / `npm run serve` from this folder)
// Point the API at it: appsettings.Development.json already sets
//   Integrations:HanifErpBaseUrl = http://localhost:5099/api/v1
//   HANIF_ERP_API_KEY            = demo-hanif-erp-key   (must match this server's own key below)
//
// Deliberately plain Node + Express, no build step, no TypeScript — this only needs to exist for
// local dev/demo, and keeping it dependency-light means `npm install` inside apps/mock-erp is
// the only setup required. See README.md in this folder for the full scenario-switch walkthrough.
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.MOCK_ERP_PORT ? Number(process.env.MOCK_ERP_PORT) : 5099;
const API_KEY = process.env.HANIF_ERP_API_KEY || 'demo-hanif-erp-key';
const REQUIRE_AUTH = process.env.MOCK_ERP_REQUIRE_AUTH !== 'false';

// ---------------------------------------------------------------------------------------------
// In-memory state. Resets every time this process restarts — that's intentional, this is a demo
// fixture, not a real ERP with real persistence. POST /__reset clears it on demand without a
// restart.
// ---------------------------------------------------------------------------------------------
const SCENARIOS = ['success', 'pending_then_confirmed', 'seat_unavailable', 'server_error', 'slow', 'always_pending'];
let currentScenario = 'success';

/** @type {Map<string, { status: string, externalBookingKey: string, externalPnr: string, tripId: string, seatNumbers: string[], attempts: number }>} */
const bookings = new Map();

/** @type {Map<string, Set<string>>} tripId -> seat numbers this mock considers sold */
const soldSeatsByTrip = new Map();

function markSeatsSold(tripId, seatNumbers) {
  if (!tripId || !Array.isArray(seatNumbers)) return;
  if (!soldSeatsByTrip.has(tripId)) soldSeatsByTrip.set(tripId, new Set());
  const set = soldSeatsByTrip.get(tripId);
  for (const seat of seatNumbers) set.add(String(seat).toUpperCase());
}

function soldSeatsFor(tripId) {
  const set = new Set(soldSeatsByTrip.get(tripId) || []);
  // seat_unavailable always reports seat "A1" sold on every trip, regardless of booking
  // history, so the live-availability check (SeatHoldsController -> CheckSeatAvailabilityAsync)
  // has something to refuse immediately, without needing a prior ConfirmBooking call first.
  if (currentScenario === 'seat_unavailable') set.add('A1');
  return Array.from(set);
}

function newExternalKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function requireAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const provided = req.get('X-API-Key');
  if (provided !== API_KEY) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid X-API-Key header.' });
  }
  next();
}

function log(label, extra) {
  const scenario = currentScenario;
  // eslint-disable-next-line no-console
  console.log(`[mock-erp] ${label} (scenario=${scenario})`, extra ? JSON.stringify(extra) : '');
}

// ---------------------------------------------------------------------------------------------
// Operational routes — no auth required. GET /health backs OperatorIntegrationsController's
// "Test connection" button (ExternalBookingSyncService.TestConnectionAsync).
// ---------------------------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', scenario: currentScenario, uptimeSeconds: Math.round(process.uptime()) });
});

app.get('/__scenario', (req, res) => {
  res.json({ scenario: currentScenario, availableScenarios: SCENARIOS });
});

app.post('/__scenario', (req, res) => {
  const { scenario } = req.body || {};
  if (!SCENARIOS.includes(scenario)) {
    return res.status(400).json({
      error: 'UNKNOWN_SCENARIO',
      message: `scenario must be one of: ${SCENARIOS.join(', ')}`,
    });
  }
  currentScenario = scenario;
  log('scenario changed');
  res.json({ scenario: currentScenario });
});

app.post('/__reset', (req, res) => {
  bookings.clear();
  soldSeatsByTrip.clear();
  currentScenario = 'success';
  log('state reset');
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------------------------
// The four calls in EXTERNAL_ERP_INTEGRATION_CONTRACT.md. All under /api/v1 and all require
// the X-API-Key header, matching what ExternalBookingSyncService.ApplyAuth sends.
// ---------------------------------------------------------------------------------------------
const api = express.Router();
api.use(requireAuth);

// GetSeatAvailability — GET /trips/:tripId/seats
api.get('/trips/:tripId/seats', (req, res) => {
  const { tripId } = req.params;
  const soldSeatNumbers = soldSeatsFor(tripId);
  log('GetSeatAvailability', { tripId, soldSeatNumbers });
  res.json({ tripId, soldSeatNumbers, checkedAtUtc: new Date().toISOString() });
});

// ConfirmBooking — POST /bookings/confirm
api.post('/bookings/confirm', async (req, res) => {
  const { bookingId, pnr, tripId, seatNumbers, grandTotal, currency } = req.body || {};

  if (!bookingId) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: 'bookingId is required.' });
  }

  log('ConfirmBooking received', { bookingId, pnr, tripId, seatNumbers, grandTotal, currency });

  if (currentScenario === 'server_error') {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Simulated ERP outage.' });
  }

  if (currentScenario === 'seat_unavailable') {
    markSeatsSold(tripId, seatNumbers);
    return res.status(409).json({
      error: 'SEAT_UNAVAILABLE',
      message: `Seat(s) ${(seatNumbers || []).join(', ')} already sold through another channel.`,
    });
  }

  const existing = bookings.get(bookingId);

  if (currentScenario === 'always_pending') {
    const record = existing || { status: 'Pending', tripId, seatNumbers, attempts: 0 };
    record.attempts += 1;
    bookings.set(bookingId, record);
    return res.status(202).json({ status: 'Pending', message: 'Still processing.' });
  }

  if (currentScenario === 'pending_then_confirmed') {
    const record = existing || { status: 'Pending', tripId, seatNumbers, attempts: 0 };
    record.attempts += 1;

    if (record.attempts < 2) {
      bookings.set(bookingId, record);
      return res.status(202).json({ status: 'Pending', message: 'Still processing — check back shortly.' });
    }

    record.status = 'Confirmed';
    record.externalBookingKey = record.externalBookingKey || newExternalKey('HAN-BK');
    record.externalPnr = record.externalPnr || `HAN-${(pnr || bookingId).toString().slice(-6).toUpperCase()}`;
    bookings.set(bookingId, record);
    markSeatsSold(tripId, seatNumbers);
    return res.json({ status: 'Confirmed', externalBookingKey: record.externalBookingKey, externalPnr: record.externalPnr });
  }

  if (currentScenario === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }

  // 'success' (default) and the tail end of 'slow'.
  const record = existing || { status: 'Pending', tripId, seatNumbers, attempts: 0 };
  record.attempts += 1;
  record.status = 'Confirmed';
  record.externalBookingKey = record.externalBookingKey || newExternalKey('HAN-BK');
  record.externalPnr = record.externalPnr || `HAN-${(pnr || bookingId).toString().slice(-6).toUpperCase()}`;
  bookings.set(bookingId, record);
  markSeatsSold(tripId, seatNumbers);

  res.json({ status: 'Confirmed', externalBookingKey: record.externalBookingKey, externalPnr: record.externalPnr });
});

// GetBookingStatus — GET /bookings/:bookingId/status
// Not currently called by ExternalBookingSyncService (see its class-level comment) — implemented
// here for contract completeness and for a future "check status now" admin action.
api.get('/bookings/:bookingId/status', (req, res) => {
  const record = bookings.get(req.params.bookingId);
  if (!record) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown bookingId.' });
  }
  res.json({
    bookingId: req.params.bookingId,
    status: record.status,
    externalBookingKey: record.externalBookingKey || null,
    externalPnr: record.externalPnr || null,
  });
});

// CancelBooking — POST /bookings/:bookingId/cancel
api.post('/bookings/:bookingId/cancel', (req, res) => {
  const { bookingId } = req.params;
  const record = bookings.get(bookingId);

  if (record) {
    record.status = 'Cancelled';
    bookings.set(bookingId, record);
  }

  log('CancelBooking', { bookingId, found: Boolean(record) });

  // Idempotent/permissive — cancelling something this mock never confirmed still succeeds,
  // same as most real cancel endpoints.
  res.json({ bookingId, status: 'Cancelled' });
});

app.use('/api/v1', api);

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-erp] listening on http://localhost:${PORT} (auth ${REQUIRE_AUTH ? 'ON' : 'OFF'}, scenario=${currentScenario})`);
});

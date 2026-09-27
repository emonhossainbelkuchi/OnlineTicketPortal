import { FormEvent, useEffect, useState } from 'react';
import type {
  ApiError,
  BusOperator,
  BusOperatorCreateRequest,
  BusRoute,
  OperatorInventoryMode,
  OperatorRouteCreateRequest,
} from '@ticketportal-mono/models';
import { apiFetch } from '../lib/apiClient';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';

const INVENTORY_MODES: OperatorInventoryMode[] = ['PlatformManaged', 'ExternalApiManaged', 'Hybrid'];

const emptyOperatorForm: BusOperatorCreateRequest = {
  name: '',
  legalName: '',
  registrationNumber: '',
  contactPhone: '',
  email: '',
  addressLine: '',
  city: '',
  district: '',
  country: 'Bangladesh',
  foundedYear: null,
  registeredOnUtc: null,
  inventoryMode: 'PlatformManaged',
  operatorRoutes: [],
};

const emptyRouteRow: OperatorRouteCreateRequest = {
  busRouteId: '',
  operatorRouteCode: '',
  displayName: '',
  inventoryModeOverride: null,
};

// Backend: BusOperatorsController -> GET /busoperators, POST /busoperators.
// This is the one onboarding step every other Piece 4-7 screen assumes already happened —
// StaffPage's "Bus operator" picker, the Operator panel's whole OperatorContextService
// resolution, Counter Setup's operator scoping, none of them can produce a BusOperator on
// their own, they can only attach to one that already exists. Create is Admin/platform-Staff
// only server-side (see the controller's own header comment), matching this page being
// admin-only.
export function OperatorsPage() {
  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<BusOperatorCreateRequest>(emptyOperatorForm);
  const [routeRows, setRouteRows] = useState<OperatorRouteCreateRequest[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [operatorList, routeList] = await Promise.all([
        apiFetch<BusOperator[]>('busoperators'),
        apiFetch<BusRoute[]>('busroutes'),
      ]);
      setOperators(operatorList);
      setBusRoutes(routeList);
    } catch (err) {
      setLoadError((err as ApiError).message ?? 'Could not load operators.');
    } finally {
      setLoading(false);
    }
  }

  function addRouteRow() {
    setRouteRows((rows) => [...rows, { ...emptyRouteRow }]);
  }

  function updateRouteRow(index: number, patch: Partial<OperatorRouteCreateRequest>) {
    setRouteRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRouteRow(index: number) {
    setRouteRows((rows) => rows.filter((_, i) => i !== index));
  }

  function resetForm() {
    setForm(emptyOperatorForm);
    setRouteRows([]);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const payload: BusOperatorCreateRequest = {
        ...form,
        legalName: form.legalName || null,
        registrationNumber: form.registrationNumber || null,
        email: form.email || null,
        foundedYear: form.foundedYear || null,
        registeredOnUtc: form.registeredOnUtc || null,
        operatorRoutes: routeRows
          .filter((r) => r.busRouteId && r.operatorRouteCode)
          .map((r) => ({
            busRouteId: r.busRouteId,
            operatorRouteCode: r.operatorRouteCode,
            displayName: r.displayName || null,
            inventoryModeOverride: r.inventoryModeOverride || null,
          })),
      };
      const result = await apiFetch<BusOperator>('busoperators', { method: 'POST', body: payload });
      setCreateSuccess(`Operator "${result.name}" created. It now shows up in every operator picker across the app.`);
      resetForm();
      await loadAll();
    } catch (err) {
      setCreateError((err as ApiError).message ?? 'Could not create the operator.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Bus Operators</h2>
          <p className="tp-muted">
            Onboard a new operator company here first — its own profile, fleet, routes, trips and
            staff are all managed afterward from the Operator Panel and this page's Users &amp;
            Roles screen.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? 'Cancel' : 'New Operator'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="form-card">
          <h3>New Operator</h3>
          <form onSubmit={handleCreate} className="form-grid">
            <label className="field">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              Legal name
              <input value={form.legalName ?? ''} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </label>
            <label className="field">
              Registration number
              <input
                value={form.registrationNumber ?? ''}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              />
            </label>
            <label className="field">
              Contact phone
              <input
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="field">
              Founded year
              <input
                type="number"
                value={form.foundedYear ?? ''}
                onChange={(e) => setForm({ ...form, foundedYear: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className="field">
              Address
              <input
                value={form.addressLine}
                onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                required
              />
            </label>
            <label className="field">
              City
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </label>
            <label className="field">
              District
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required />
            </label>
            <label className="field">
              Country
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
            </label>
            <label className="field">
              Registered on
              <input
                type="date"
                value={form.registeredOnUtc ? form.registeredOnUtc.slice(0, 10) : ''}
                onChange={(e) => setForm({ ...form, registeredOnUtc: e.target.value ? `${e.target.value}T00:00:00Z` : null })}
              />
            </label>
            <label className="field">
              Inventory mode
              <select
                value={form.inventoryMode}
                onChange={(e) => setForm({ ...form, inventoryMode: e.target.value as OperatorInventoryMode })}
              >
                {INVENTORY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-grid__span-all">
              <div className="page-header">
                <h4>Routes this operator runs (optional here — can also be added later from the Operator Panel's Network Setup screen)</h4>
                <Button type="button" variant="secondary" size="sm" onClick={addRouteRow}>
                  + Add Route
                </Button>
              </div>

              {routeRows.map((row, index) => (
                <div key={index} className="route-row">
                  <select
                    value={row.busRouteId}
                    onChange={(e) => updateRouteRow(index, { busRouteId: e.target.value })}
                  >
                    <option value="">Select a unified route…</option>
                    {busRoutes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.routeCode} — {r.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Your route code"
                    value={row.operatorRouteCode}
                    onChange={(e) => updateRouteRow(index, { operatorRouteCode: e.target.value })}
                  />
                  <input
                    placeholder="Display name (optional)"
                    value={row.displayName ?? ''}
                    onChange={(e) => updateRouteRow(index, { displayName: e.target.value })}
                  />
                  <Button type="button" variant="danger" size="sm" onClick={() => removeRouteRow(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            {createError && <p className="error">{createError}</p>}
            {createSuccess && <p className="success">{createSuccess}</p>}

            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create Operator'}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <p className="tp-muted">Loading operators…</p>
        ) : loadError ? (
          <p className="error">{loadError}</p>
        ) : operators.length === 0 ? (
          <p className="tp-muted">No operators yet — create one above to get started.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Registration No.</th>
                <th>City</th>
                <th>Inventory Mode</th>
                <th>Routes</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.id}>
                  <td>
                    <div className="data-table__primary">{op.name}</div>
                    {op.legalName && <div className="tp-muted data-table__secondary">{op.legalName}</div>}
                  </td>
                  <td>{op.registrationNumber ?? '—'}</td>
                  <td>{op.city}</td>
                  <td>{op.inventoryMode}</td>
                  <td>{op.operatorRoutes.length}</td>
                  <td>
                    <StatusPill status={op.isActive ? 'Active' : 'Cancelled'} />
                  </td>
                  <td className="tp-muted">{new Date(op.createdAtUtc).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

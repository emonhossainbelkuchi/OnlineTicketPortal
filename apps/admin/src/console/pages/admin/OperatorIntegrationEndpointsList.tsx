// OperatorIntegrationEndpointsList.tsx — same pattern as BusAmenityMappingsList.tsx /
// BusImagesList.tsx: replaces the generic raw-GUID resource table with a
// grouped-by-integration view. No localStorage — every fetch/mutation goes straight to the
// API and reloads.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchEndpoints,
  fetchIntegrations,
  deleteEndpoint,
  integrationLabel,
  extractErrorMessage,
} from '@/services/operatorIntegrationEndpointService';
import type { OperatorIntegrationEndpoint, OperatorIntegrationRef } from '@/types/operatorIntegrationEndpoint.types';

const PAGE_SIZE = 6;

const METHOD_BADGE: Record<string, string> = {
  GET: 'bg-primary',
  POST: 'bg-success',
  PUT: 'bg-warning text-dark',
  PATCH: 'bg-warning text-dark',
  DELETE: 'bg-danger',
};

export default function OperatorIntegrationEndpointsList() {
  const navigate = useNavigate();
  const [endpoints, setEndpoints] = useState<OperatorIntegrationEndpoint[]>([]);
  const [integrations, setIntegrations] = useState<OperatorIntegrationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [eps, ints] = await Promise.all([fetchEndpoints(), fetchIntegrations()]);
      setEndpoints(eps);
      setIntegrations(ints);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const integrationById = useMemo(() => new Map(integrations.map((i) => [i.id, i])), [integrations]);

  const grouped = useMemo(() => {
    const byIntegration = new Map<string, OperatorIntegrationEndpoint[]>();
    for (const ep of endpoints) {
      const list = byIntegration.get(ep.operatorIntegrationId) ?? [];
      list.push(ep);
      byIntegration.set(ep.operatorIntegrationId, list);
    }
    return integrations
      .map((integration) => ({ integration, endpoints: byIntegration.get(integration.id) ?? [] }))
      .filter((g) => g.endpoints.length > 0)
      .sort((a, b) => integrationLabel(a.integration).localeCompare(integrationLabel(b.integration)));
  }, [integrations, endpoints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(
      ({ integration, endpoints: rows }) =>
        integrationLabel(integration).toLowerCase().includes(q) ||
        rows.some((r) => r.purpose.toLowerCase().includes(q) || r.pathTemplate.toLowerCase().includes(q)),
    );
  }, [grouped, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  async function handleDelete(ep: OperatorIntegrationEndpoint) {
    if (!window.confirm(`Delete the "${ep.purpose}" endpoint?`)) return;
    setBusyId(ep.id);
    try {
      await deleteEndpoint(ep.id);
      toast.success('Deleted.');
      await loadAll();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-plug me-2" />
          Operator Integration Endpoints
          <span className="badge bg-info ms-2 align-middle">
            <i className="fa-solid fa-rotate fa-spin me-1" style={{ fontSize: '0.7em' }} />
            Live
          </span>
        </h4>
        <button className="btn btn-primary" onClick={() => navigate('/admin/operator-integration-endpoints/new')}>
          <i className="fa-solid fa-plus me-1" />
          New Endpoint
        </button>
      </div>

      <div className="row mb-3 g-2">
        <div className="col-md-5">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fa-solid fa-magnifying-glass" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by integration, purpose, or path..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="col-md-auto ms-auto text-muted align-self-center">
          {filtered.length} integration(s) · {endpoints.length} endpoint(s) total
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted">
          <i className="fa-solid fa-spinner fa-spin me-2" />
          Loading...
        </div>
      ) : pageItems.length === 0 ? (
        <div className="text-center py-5 text-muted">No integrations match your search.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {pageItems.map(({ integration, endpoints: rows }) => (
            <div key={integration.id} className="card shadow-sm">
              <div className="card-body">
                <strong className="d-block mb-2">
                  <i className="fa-solid fa-server me-1 text-muted" />
                  {integrationLabel(integration)}
                  {!integration.isActive && <span className="badge bg-secondary ms-2">Integration inactive</span>}
                </strong>
                <table className="table table-sm mb-0 align-middle">
                  <thead>
                    <tr className="text-muted small">
                      <th>Purpose</th>
                      <th>Method</th>
                      <th>Path</th>
                      <th>Active</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((ep) => (
                      <tr key={ep.id}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none"
                            onClick={() => navigate(`/admin/operator-integration-endpoints/${ep.id}`)}
                          >
                            {ep.purpose}
                          </button>
                        </td>
                        <td>
                          <span className={`badge ${METHOD_BADGE[ep.httpMethod] ?? 'bg-secondary'}`}>{ep.httpMethod}</span>
                        </td>
                        <td>
                          <code>{ep.pathTemplate}</code>
                        </td>
                        <td>{ep.isActive ? <span className="text-success">Yes</span> : <span className="text-muted">No</span>}</td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => navigate(`/admin/operator-integration-endpoints/${ep.id}/edit`)}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              disabled={busyId === ep.id}
                              onClick={() => handleDelete(ep)}
                            >
                              {busyId === ep.id ? (
                                <i className="fa-solid fa-spinner fa-spin" />
                              ) : (
                                <i className="fa-solid fa-trash" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <i className="fa-solid fa-angle-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <i className="fa-solid fa-angle-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

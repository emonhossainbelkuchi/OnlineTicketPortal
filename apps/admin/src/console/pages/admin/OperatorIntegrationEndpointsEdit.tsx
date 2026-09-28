import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchEndpoints,
  fetchIntegrations,
  updateEndpoint,
  integrationLabel,
  extractErrorMessage,
} from '@/services/operatorIntegrationEndpointService';
import { HTTP_METHODS } from '@/types/operatorIntegrationEndpoint.types';
import type { OperatorIntegrationEndpoint, OperatorIntegrationRef } from '@/types/operatorIntegrationEndpoint.types';

export default function OperatorIntegrationEndpointsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState<OperatorIntegrationEndpoint | null>(null);
  const [integrations, setIntegrations] = useState<OperatorIntegrationRef[]>([]);
  const [operatorIntegrationId, setOperatorIntegrationId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [pathTemplate, setPathTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [endpoints, ints] = await Promise.all([fetchEndpoints(), fetchIntegrations()]);
        const found = endpoints.find((e) => e.id === id) ?? null;
        setEndpoint(found);
        setIntegrations(ints);
        if (found) {
          setOperatorIntegrationId(found.operatorIntegrationId);
          setPurpose(found.purpose);
          setHttpMethod(found.httpMethod);
          setPathTemplate(found.pathTemplate);
          setIsActive(found.isActive);
        }
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const options = useMemo(
    () => [...integrations].sort((a, b) => integrationLabel(a).localeCompare(integrationLabel(b))),
    [integrations],
  );

  async function handleSave() {
    if (!endpoint || !operatorIntegrationId || !purpose.trim() || !pathTemplate.trim()) return;
    setSaving(true);
    try {
      // rowVersion echoed back exactly as GET returned it — the optimistic-concurrency token,
      // same as BusImagesEdit.tsx. A stale save (someone else edited this row meanwhile) comes
      // back as a 409 Conflict, which extractErrorMessage below turns into a toast instead of
      // silently overwriting their change.
      await updateEndpoint(endpoint.id, {
        operatorIntegrationId,
        purpose: purpose.trim(),
        httpMethod,
        pathTemplate: pathTemplate.trim(),
        isActive,
        rowVersion: endpoint.rowVersion,
      });
      toast.success('Saved.');
      navigate(`/admin/operator-integration-endpoints/${endpoint.id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" />
        Loading...
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        Endpoint not found — it may have already been deleted.
        <div className="mt-3">
          <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/operator-integration-endpoints')}>
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 640 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2" />
        Edit Operator Integration Endpoint
      </h4>

      <div className="mb-3">
        <label className="form-label">Integration</label>
        <select
          className="form-select"
          value={operatorIntegrationId}
          onChange={(e) => setOperatorIntegrationId(e.target.value)}
        >
          {options.map((i) => (
            <option key={i.id} value={i.id}>
              {integrationLabel(i)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Purpose</label>
        <input type="text" className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </div>

      <div className="row mb-3">
        <div className="col-4">
          <label className="form-label">HTTP method</label>
          <select className="form-select" value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}>
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="col-8">
          <label className="form-label">Path template</label>
          <input
            type="text"
            className="form-control"
            value={pathTemplate}
            onChange={(e) => setPathTemplate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="isActiveEdit"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="isActiveEdit">
          Active
        </label>
      </div>

      <div className="d-flex gap-2">
        <button
          className="btn btn-primary"
          disabled={!operatorIntegrationId || !purpose.trim() || !pathTemplate.trim() || saving}
          onClick={handleSave}
        >
          {saving ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-check me-1" />}
          Save
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(`/admin/operator-integration-endpoints/${endpoint.id}`)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

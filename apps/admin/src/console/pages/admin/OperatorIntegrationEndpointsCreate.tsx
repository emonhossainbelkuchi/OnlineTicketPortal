import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchIntegrations,
  createEndpoint,
  integrationLabel,
  extractErrorMessage,
} from '@/services/operatorIntegrationEndpointService';
import { HTTP_METHODS } from '@/types/operatorIntegrationEndpoint.types';
import type { OperatorIntegrationRef } from '@/types/operatorIntegrationEndpoint.types';

export default function OperatorIntegrationEndpointsCreate() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<OperatorIntegrationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorIntegrationId, setOperatorIntegrationId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [httpMethod, setHttpMethod] = useState<string>('GET');
  const [pathTemplate, setPathTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setIntegrations(await fetchIntegrations());
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options = useMemo(
    () => [...integrations].sort((a, b) => integrationLabel(a).localeCompare(integrationLabel(b))),
    [integrations],
  );

  async function handleSave() {
    if (!operatorIntegrationId || !purpose.trim() || !pathTemplate.trim()) return;
    setSaving(true);
    try {
      const created = await createEndpoint({
        operatorIntegrationId,
        purpose: purpose.trim(),
        httpMethod,
        pathTemplate: pathTemplate.trim(),
        isActive,
      });
      toast.success('Endpoint added.');
      navigate(`/admin/operator-integration-endpoints/${created.id}`);
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

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 640 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-plus me-2" />
        New Operator Integration Endpoint
      </h4>

      <div className="mb-3">
        <label className="form-label">Integration</label>
        <select
          className="form-select"
          value={operatorIntegrationId}
          onChange={(e) => setOperatorIntegrationId(e.target.value)}
        >
          <option value="">Select an integration...</option>
          {options.map((i) => (
            <option key={i.id} value={i.id}>
              {integrationLabel(i)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">Purpose</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. ConfirmBooking"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
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
            placeholder="e.g. /bookings/{bookingId}/cancel"
            value={pathTemplate}
            onChange={(e) => setPathTemplate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="isActive">
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
        <button className="btn btn-outline-secondary" onClick={() => navigate('/admin/operator-integration-endpoints')}>
          Cancel
        </button>
      </div>
    </div>
  );
}

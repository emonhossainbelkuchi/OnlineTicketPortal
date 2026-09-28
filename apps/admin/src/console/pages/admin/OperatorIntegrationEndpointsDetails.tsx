import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  fetchEndpoints,
  fetchIntegrations,
  deleteEndpoint,
  integrationLabel,
  extractErrorMessage,
} from '@/services/operatorIntegrationEndpointService';
import type { OperatorIntegrationEndpoint, OperatorIntegrationRef } from '@/types/operatorIntegrationEndpoint.types';

export default function OperatorIntegrationEndpointsDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState<OperatorIntegrationEndpoint | null>(null);
  const [integration, setIntegration] = useState<OperatorIntegrationRef | undefined>();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [endpoints, integrations] = await Promise.all([fetchEndpoints(), fetchIntegrations()]);
        const found = endpoints.find((e) => e.id === id) ?? null;
        setEndpoint(found);
        setIntegration(integrations.find((i) => i.id === found?.operatorIntegrationId));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleDelete() {
    if (!endpoint || !window.confirm(`Delete the "${endpoint.purpose}" endpoint?`)) return;
    setDeleting(true);
    try {
      await deleteEndpoint(endpoint.id);
      toast.success('Deleted.');
      navigate('/admin/operator-integration-endpoints');
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setDeleting(false);
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
    <div className="container-fluid py-3" style={{ maxWidth: 560 }}>
      <h4 className="mb-3">
        <i className="fa-solid fa-plug me-2" />
        Operator Integration Endpoint
      </h4>

      <dl className="row">
        <dt className="col-sm-4">Integration</dt>
        <dd className="col-sm-8">{integrationLabel(integration)}</dd>

        <dt className="col-sm-4">Purpose</dt>
        <dd className="col-sm-8">{endpoint.purpose}</dd>

        <dt className="col-sm-4">Method</dt>
        <dd className="col-sm-8">
          <span className="badge bg-secondary">{endpoint.httpMethod}</span>
        </dd>

        <dt className="col-sm-4">Path template</dt>
        <dd className="col-sm-8">
          <code>{endpoint.pathTemplate}</code>
        </dd>

        <dt className="col-sm-4">Active</dt>
        <dd className="col-sm-8">{endpoint.isActive ? 'Yes' : 'No'}</dd>

        <dt className="col-sm-4">Endpoint Id</dt>
        <dd className="col-sm-8 text-muted small">{endpoint.id}</dd>
      </dl>

      <div className="d-flex gap-2">
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate(`/admin/operator-integration-endpoints/${endpoint.id}/edit`)}
        >
          <i className="fa-solid fa-pen me-1" />
          Edit
        </button>
        <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
          {deleting ? <i className="fa-solid fa-spinner fa-spin me-1" /> : <i className="fa-solid fa-trash me-1" />}
          Delete
        </button>
        <button className="btn btn-outline-secondary ms-auto" onClick={() => navigate('/admin/operator-integration-endpoints')}>
          Back
        </button>
      </div>
    </div>
  );
}

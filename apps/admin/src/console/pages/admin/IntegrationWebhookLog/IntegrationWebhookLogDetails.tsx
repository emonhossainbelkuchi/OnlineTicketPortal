import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getWebhookLogById, IntegrationWebhookLogResponseDto } from '@/services/integrationWebhookLogService';
import { useAuth } from '@/lib/auth';

function prettyJson(raw?: string | null): { text: string; isValidJson: boolean } {
  if (!raw) return { text: '', isValidJson: false };
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2), isValidJson: true };
  } catch {
    return { text: raw, isValidJson: false };
  }
}

const POLL_INTERVAL_MS = 15000;

export const IntegrationWebhookLogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const isPlatformStaff = hasRole('Admin', 'Staff');

  const [item, setItem] = useState<IntegrationWebhookLogResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setError('');
    setForbidden(false);
    try {
      const data = await getWebhookLogById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) setForbidden(true);
      else setError(err?.message || 'Could not load webhook log from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  if (!isPlatformStaff) {
    return (
      <div className="alert alert-secondary">
        <i className="fa-solid fa-lock me-1" /> Integration webhook logs are visible to platform
        Admin/Staff only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading webhook log from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-danger">
        <i className="fa-solid fa-lock me-1" /> You don't have access to this webhook log.{' '}
        <Link to="/admin/integration-webhook-logs">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Webhook log not found.{' '}
        <Link to="/admin/integration-webhook-logs">Back to list</Link>
      </div>
    );
  }

  const payload = prettyJson(item.payloadJson);

  return (
    <div className="pb-4" style={{ maxWidth: 900 }}>
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/integration-webhook-logs" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-satellite-dish text-success me-2" />
            Webhook Log
          </h1>
        </div>
        <span className="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle">
          <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} /> Live · auto-refreshing
        </span>
      </div>

      {item.errorMessage && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="fa-solid fa-triangle-exclamation me-1" /> <strong>Error:</strong> {item.errorMessage}
        </div>
      )}

      <div className="bg-white rounded-3 border shadow-sm p-4 mb-3">
        <div className="row g-4">
          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Event Type</span>
            <span className="badge text-bg-light border font-monospace fs-6">{item.eventType}</span>
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Status</span>
            {item.errorMessage ? (
              <span className="badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                <i className="fa-solid fa-circle-exclamation me-1" /> Error
              </span>
            ) : item.isProcessed ? (
              <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle">
                <i className="fa-solid fa-circle-check me-1" /> Processed
              </span>
            ) : (
              <span className="badge text-bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                <i className="fa-solid fa-clock me-1" /> Pending
              </span>
            )}
          </div>

          <div className="col-md-4">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">External Event ID</span>
            <span className="font-monospace">{item.externalEventId || '—'}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Operator Integration</span>
            <span className="badge text-bg-light border font-monospace small">{item.operatorIntegrationId}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Concurrency Token</span>
            <span className="badge text-bg-light border font-monospace small">{item.rowVersion}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Received At</span>
            <span>{new Date(item.receivedAtUtc).toLocaleString()}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Processed At</span>
            <span>{item.processedAtUtc ? new Date(item.processedAtUtc).toLocaleString() : '—'}</span>
          </div>
        </div>
      </div>

      {/* Payload viewer */}
      <div className="bg-white rounded-3 border shadow-sm overflow-hidden mb-3">
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
          <span className="fw-semibold small">
            <i className="fa-solid fa-code me-1" /> Payload {payload.isValidJson ? '(JSON)' : '(raw)'}
          </span>
          {item.payloadJson && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => copyToClipboard(item.payloadJson || '', 'Payload')}
            >
              <i className="fa-solid fa-copy me-1" /> Copy
            </button>
          )}
        </div>
        <pre
          className="m-0 p-3 small"
          style={{ maxHeight: 400, overflow: 'auto', background: '#0d1117', color: '#c9d1d9' }}
        >
          {payload.text || <span className="text-muted">No payload recorded.</span>}
        </pre>
      </div>

      <div className="text-muted small">
        <i className="fa-regular fa-clock me-1" /> Created: {new Date(item.createdAtUtc).toLocaleString()}
        {item.updatedAtUtc && (
          <>
            {' '}
            · Last Updated: {new Date(item.updatedAtUtc).toLocaleString()}
          </>
        )}
      </div>
    </div>
  );
};

export default IntegrationWebhookLogDetails;

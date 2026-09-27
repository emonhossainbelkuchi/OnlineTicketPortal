import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getActivityLogById, ActivityLogResponseDto } from '@/services/activityLogService';
import { useAuth } from '@/lib/auth';

const POLL_INTERVAL_MS = 15000;

export const ActivityLogDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canView = hasRole('Admin', 'Staff');

  const [item, setItem] = useState<ActivityLogResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setError('');
    setForbidden(false);
    try {
      const data = await getActivityLogById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) setForbidden(true);
      else setError(err?.message || 'Could not load activity log from the API.');
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

  if (!canView) {
    return (
      <div className="alert alert-secondary">
        <i className="fa-solid fa-lock me-1" /> Activity logs are visible to Admin/Staff only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading activity log from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-danger">
        <i className="fa-solid fa-lock me-1" /> You don't have access to this entry.{' '}
        <Link to="/admin/activity-logs">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Activity log entry not found.{' '}
        <Link to="/admin/activity-logs">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="pb-4" style={{ maxWidth: 760 }}>
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/activity-logs" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-list-check text-success me-2" />
            Activity Log Entry
          </h1>
        </div>
        <span className="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle">
          <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} /> Live · auto-refreshing
        </span>
      </div>

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Action</span>
            <span className="badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle fs-6">
              {item.action}
            </span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">When</span>
            <span>{new Date(item.createdAtUtc).toLocaleString()}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Entity</span>
            <span>{item.entityName || <span className="text-muted fst-italic">None</span>}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Entity ID</span>
            <div className="d-flex align-items-center gap-2">
              <span className="font-monospace text-break">{item.entityId || '—'}</span>
              {item.entityId && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => copyToClipboard(item.entityId!, 'Entity ID')}
                >
                  <i className="fa-solid fa-copy" />
                </button>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">User ID</span>
            <span className="font-monospace text-break">{item.userId || <span className="text-muted fst-italic">System / unauthenticated</span>}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">IP Address</span>
            <span className="font-monospace">{item.ipAddress || '—'}</span>
          </div>

          <div className="col-12">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Concurrency Token</span>
            <span className="badge text-bg-light border font-monospace small">{item.rowVersion}</span>
          </div>

          <div className="col-12">
            <hr />
          </div>

          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Created: {new Date(item.createdAtUtc).toLocaleString()}
          </div>
          <div className="col-md-6 text-muted small">
            <i className="fa-regular fa-clock me-1" /> Last Updated:{' '}
            {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogDetails;

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLoginHistoryById, LoginHistoryResponseDto, summarizeUserAgent, actorDisplayName } from '@/services/loginHistoryService';
import { useAuth } from '@/lib/auth';

const POLL_INTERVAL_MS = 15000;

export const LoginHistoryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [item, setItem] = useState<LoginHistoryResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setError('');
    setForbidden(false);
    try {
      const data = await getLoginHistoryById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setItem(data);
        setNotFound(false);
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 403) setForbidden(true);
      else setError(err?.message || 'Could not load login history entry from the API.');
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

  if (loading) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
        Loading login history entry from API...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="alert alert-danger">
        <i className="fa-solid fa-lock me-1" /> That's not your own login history, and you're not
        Admin/Staff. <Link to="/admin/login-histories">Back to list</Link>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="alert alert-warning">
        <i className="fa-solid fa-triangle-exclamation me-1" /> Login history entry not found.{' '}
        <Link to="/admin/login-histories">Back to list</Link>
      </div>
    );
  }

  const isYou = user?.id === item.userId;

  return (
    <div className="pb-4" style={{ maxWidth: 760 }}>
      {error && (
        <div className="alert alert-danger py-2 small">
          <i className="fa-solid fa-circle-exclamation me-1" /> {error}
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin/login-histories" className="btn btn-sm btn-outline-secondary">
            <i className="fa-solid fa-arrow-left me-1" /> Back
          </Link>
          <h1 className="h5 fw-bold mb-0">
            <i className="fa-solid fa-right-to-bracket text-success me-2" />
            Login Attempt
          </h1>
        </div>
        <span className="badge rounded-pill text-bg-success-subtle text-success-emphasis border border-success-subtle">
          <i className="fa-solid fa-circle me-1" style={{ fontSize: 8 }} /> Live · auto-refreshing
        </span>
      </div>

      {!item.success && (
        <div className="alert alert-danger py-2 small mb-3">
          <i className="fa-solid fa-triangle-exclamation me-1" /> This was a <strong>failed</strong>{' '}
          login attempt.
          {isYou && " If this wasn't you, consider changing your password."}
        </div>
      )}

      <div className="bg-white rounded-3 border shadow-sm p-4">
        <div className="row g-4">
          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Status</span>
            {item.success ? (
              <span className="badge text-bg-success-subtle text-success-emphasis border border-success-subtle fs-6">
                <i className="fa-solid fa-circle-check me-1" /> Success
              </span>
            ) : (
              <span className="badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle fs-6">
                <i className="fa-solid fa-circle-xmark me-1" /> Failed
              </span>
            )}
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">When</span>
            <span>{new Date(item.loginAtUtc).toLocaleString()}</span>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Actor</span>
            <div className="d-flex align-items-center gap-2">
              <span className="text-break" title={item.userId}>{actorDisplayName(item)}</span>
              {isYou && <span className="badge text-bg-light border">You</span>}
            </div>
          </div>

          <div className="col-md-6">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">IP Address</span>
            <span className="font-monospace">{item.ipAddress || '—'}</span>
          </div>

          <div className="col-12">
            <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Device</span>
            <span>
              <i className="fa-solid fa-desktop me-1" /> {summarizeUserAgent(item.userAgent)}
            </span>
          </div>

          {item.userAgent && (
            <div className="col-12">
              <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Raw User Agent</span>
              <code className="small text-break d-block">{item.userAgent}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginHistoryDetails;

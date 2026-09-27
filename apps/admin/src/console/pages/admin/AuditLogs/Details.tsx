import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuditLogById, actorDisplayName, type AuditLogResponseDto } from "@/services/auditLogService";

function actionBadge(action: string) {
  const map: Record<string, string> = {
    Create: "bg-success",
    Update: "bg-info",
    Delete: "bg-danger",
  };
  return <span className={`badge ${map[action] ?? "bg-secondary"}`}>{action}</span>;
}

function prettyJson(json?: string | null) {
  if (!json) return null;
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default function AuditLogDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<AuditLogResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getAuditLogById(id)
      .then((a) => {
        if (!alive) return;
        if (!a) setNotFound(true);
        else setItem(a);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load audit log."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-warning">Audit log not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/AuditLogs">
          Back to list
        </Link>
      </div>
    );
  }

  const oldJson = prettyJson(item.oldValuesJson);
  const newJson = prettyJson(item.newValuesJson);

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/admin/resource/AuditLogs">Audit Logs</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-clipboard-list me-2 text-primary" />
          {item.entityName} {actionBadge(item.action)}
        </h4>
        <Link className="btn btn-outline-secondary" to="/admin/resource/AuditLogs">
          Back
        </Link>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-lock me-2" />
        Read-only — a compliance trail record, never editable or deletable.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Overview</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Entity</dt>
                <dd className="col-7 text-end">{item.entityName}</dd>

                <dt className="col-5 text-muted">Entity ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.entityId}>
                  {item.entityId}
                </dd>

                <dt className="col-5 text-muted">Action</dt>
                <dd className="col-7 text-end">{actionBadge(item.action)}</dd>

                <dt className="col-5 text-muted">When</dt>
                <dd className="col-7 text-end">{new Date(item.createdAtUtc).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Actor</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Actor</dt>
                <dd className="col-7 text-end text-truncate" title={item.userId ?? ""}>
                  {actorDisplayName(item)}
                </dd>

                <dt className="col-5 text-muted">IP Address</dt>
                <dd className="col-7 text-end">{item.ipAddress ?? "—"}</dd>

                <dt className="col-12 text-muted">User Agent</dt>
                <dd className="col-12 text-break">{item.userAgent ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="fa-solid fa-minus text-danger me-2" /> Old Values
            </div>
            <div className="card-body">
              {oldJson ? (
                <pre className="mb-0 small" style={{ whiteSpace: "pre-wrap" }}>
                  {oldJson}
                </pre>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="fa-solid fa-plus text-success me-2" /> New Values
            </div>
            <div className="card-body">
              {newJson ? (
                <pre className="mb-0 small" style={{ whiteSpace: "pre-wrap" }}>
                  {newJson}
                </pre>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
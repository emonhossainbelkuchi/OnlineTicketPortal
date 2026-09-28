import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import operatorSettingService from "@/services/operatorSettingService";
import { useOperatorSetting, useBusOperatorOptions } from "@/hooks/useOperatorSettings";

export default function OperatorSettingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, notFound, error: loadError, refresh } = useOperatorSetting(id);
  const { operators } = useBusOperatorOptions();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function operatorName(opId: string) {
    return operators.find((o) => o.id === opId)?.name ?? opId;
  }

  async function handleDelete() {
    if (!id || !item) return;
    if (!window.confirm(`Delete setting "${item.key}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await operatorSettingService.delete(id);
      navigate("/admin/resource/OperatorSettings");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Could not delete setting.");
      setDeleting(false);
    }
  }

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
        <div className="alert alert-warning">{loadError ?? "Operator setting not found."}</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorSettings">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item"><Link to="/admin">Admin</Link></li>
          <li className="breadcrumb-item"><Link to="/admin/resource/OperatorSettings">Operator Settings</Link></li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-sliders me-2 text-primary" />
          <code>{item.key}</code>
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={refresh} title="Refresh">
            <i className="fa-solid fa-rotate" />
          </button>
          <Link className="btn btn-outline-primary" to={`/admin/resource/OperatorSettings/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorSettings">Back</Link>
        </div>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-shield-halved me-2" />
        Admin-only — per-operator platform config; editable by anyone, this is an easy way to
        quietly change how an operator's account behaves.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">Setting</div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-3 text-muted">Bus Operator</dt>
            <dd className="col-9">{operatorName(item.busOperatorId)}</dd>

            <dt className="col-3 text-muted">Key</dt>
            <dd className="col-9"><code>{item.key}</code></dd>

            <dt className="col-3 text-muted">Value</dt>
            <dd className="col-9" style={{ whiteSpace: "pre-wrap" }}>{item.value}</dd>

            <dt className="col-3 text-muted">Description</dt>
            <dd className="col-9">{item.description ?? "—"}</dd>

            <dt className="col-3 text-muted">Created</dt>
            <dd className="col-9">{new Date(item.createdAtUtc).toLocaleString()}</dd>

            <dt className="col-3 text-muted">Last Updated</dt>
            <dd className="col-9">{item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

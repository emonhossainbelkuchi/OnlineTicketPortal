import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getSystemSettingById,
  deleteSystemSetting,
  type SystemSettingResponseDto,
} from "@/services/systemSettingService";

export default function SystemSettingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<SystemSettingResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getSystemSettingById(id)
      .then((s) => {
        if (!alive) return;
        if (!s) setNotFound(true);
        else setItem(s);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load setting."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!id || !item) return;
    if (!window.confirm(`Delete setting "${item.key}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteSystemSetting(id);
      navigate("/admin/resource/SystemSettings");
    } catch (e: any) {
      setError(e?.message ?? "Could not delete setting.");
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
        <div className="alert alert-warning">System setting not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/SystemSettings">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/admin/resource/SystemSettings">System Settings</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-gears me-2 text-primary" />
          <code>{item.key}</code>
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/SystemSettings/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/SystemSettings">
            Back
          </Link>
        </div>
      </div>

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-shield-halved me-2" />
        Admin-only — free-form platform-wide config, letting anyone write here is close to
        letting anyone reconfigure the app.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">Setting</div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-3 text-muted">Key</dt>
            <dd className="col-9">
              <code>{item.key}</code>
            </dd>

            <dt className="col-3 text-muted">Value</dt>
            <dd className="col-9" style={{ whiteSpace: "pre-wrap" }}>
              {item.value}
            </dd>

            <dt className="col-3 text-muted">Description</dt>
            <dd className="col-9">{item.description ?? "—"}</dd>

            <dt className="col-3 text-muted">Last Updated</dt>
            <dd className="col-9">
              {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}